# Syntax & Log Parser
import re
from typing import List, Dict

LOG_PATTERN = re.compile(r'\[(?P<level>\w+)\] (?P<timestamp>[\d-]+T[\d:]+) (?P<msg>.*)')

class LogParser:
    def __init__(self, level_filter: str = 'INFO'):
        self.filter = level_filter

    def parse_file(self, content: str) -> List[Dict[str, str]]:
        results = []
        for line in content.splitlines():
            m = LOG_PATTERN.match(line.strip())
            if m:
                data = m.groupdict()
                if self._matches_filter(data['level']):
                    results.append(data)
        return results

    def _matches_filter(self, level: str) -> bool:
        hierarchy = {'DEBUG': 1, 'INFO': 2, 'WARN': 3, 'ERROR': 4, 'FATAL': 5}
        return hierarchy.get(level, 0) >= hierarchy.get(self.filter, 0)
