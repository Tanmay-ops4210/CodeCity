from __future__ import annotations

import io
import tokenize

from .language_registry import LanguageSpec


def is_binary_source(source_bytes: bytes) -> bool:
    """Treat NULs as binary except when they are part of a BOM-marked Unicode encoding."""
    has_unicode_bom = source_bytes.startswith(
        (
            b"\xff\xfe\x00\x00",
            b"\x00\x00\xfe\xff",
            b"\xff\xfe",
            b"\xfe\xff",
        )
    )
    return b"\x00" in source_bytes and not has_unicode_bom


def decode_text(source_bytes: bytes) -> str:
    """Decode common source encodings without silently replacing bad bytes."""
    if source_bytes.startswith((b"\xff\xfe\x00\x00", b"\x00\x00\xfe\xff")):
        return source_bytes.decode("utf-32")
    if source_bytes.startswith((b"\xff\xfe", b"\xfe\xff")):
        return source_bytes.decode("utf-16")
    return source_bytes.decode("utf-8-sig")


def python_line_metrics(source: str) -> tuple[int, int, int, int]:
    lines = source.splitlines()
    physical_lines = len(lines)
    blank_lines = sum(1 for line in lines if not line.strip())
    comment_only: set[int] = set()
    tokens = tokenize.generate_tokens(io.StringIO(source).readline)
    try:
        for token in tokens:
            if token.type == tokenize.COMMENT:
                line_number, column = token.start
                line = lines[line_number - 1] if 0 < line_number <= len(lines) else ""
                if not line[:column].strip():
                    comment_only.add(line_number)
    except (IndentationError, SyntaxError, tokenize.TokenError):
        # Keep comments tokenized before the malformed region. Do not infer
        # comments from raw '#' characters, which may be inside strings.
        pass
    comments = len(comment_only)
    return physical_lines, physical_lines - blank_lines - comments, blank_lines, comments


def lexical_line_metrics(
    source: str,
    language: LanguageSpec,
) -> tuple[int, int, int, int]:
    """Count lines while ignoring comment markers inside quoted strings.

    This is intentionally a line-metrics lexer, not a syntax parser. Structural
    metrics remain unavailable unless a language has a real parser adapter.
    """
    lines = source.splitlines()
    physical = len(lines)
    blank = 0
    comment_only = 0
    quote: str | None = None
    block_end: str | None = None
    block_depth = 0

    for line in lines:
        index = 0
        has_code = False
        has_comment = False
        while index < len(line):
            if block_end is not None:
                has_comment = True
                if language.nested_block_comments:
                    starts = next(
                        (
                            marker
                            for marker, _ in language.block_comments
                            if line.startswith(marker, index)
                        ),
                        None,
                    )
                    if starts is not None:
                        block_depth += 1
                        index += len(starts)
                        continue
                close_at = line.find(block_end, index)
                if close_at < 0:
                    index = len(line)
                    continue
                if language.nested_block_comments:
                    block_depth -= 1
                    if block_depth > 0:
                        index = close_at + len(block_end)
                        continue
                block_end = None
                block_depth = 0
                index = close_at + _block_end_length(language, line, close_at)
                continue

            if quote is not None:
                has_code = True
                char = line[index]
                if char == "\\":
                    index += 2
                    continue
                if char == quote:
                    quote = None
                index += 1
                continue

            line_comment = next(
                (marker for marker in language.line_comments if line.startswith(marker, index)),
                None,
            )
            if line_comment is not None:
                has_comment = True
                break

            block = next(
                (
                    (start, end)
                    for start, end in language.block_comments
                    if line.startswith(start, index)
                ),
                None,
            )
            if block is not None:
                has_comment = True
                block_end = block[1]
                block_depth = 1
                index += len(block[0])
                continue

            char = line[index]
            if char in ("'", '"', "`"):
                has_code = True
                quote = char
                index += 1
                continue
            if not char.isspace():
                has_code = True
            index += 1

        if quote not in ("`",):
            quote = None
        if has_code:
            continue
        if has_comment:
            comment_only += 1
        elif not line.strip():
            blank += 1

    return physical, physical - blank - comment_only, blank, comment_only


def _block_end_length(language: LanguageSpec, line: str, close_at: int) -> int:
    for _, end in language.block_comments:
        if line.startswith(end, close_at):
            return len(end)
    return 1
