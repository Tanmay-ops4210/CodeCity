# Real-Time Data Pipeline & ETL Ingestion
import json
from typing import Generator, Dict, Any, List

class StreamIngestion:
    def __init__(self, batch_size: int = 100):
        self.batch_size = batch_size
        self.buffer: List[Dict[str, Any]] = []

    def ingest_records(self, raw_stream: Generator[str, None, None]):
        for line in raw_stream:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            cleaned = self._cleanse_record(record)
            if cleaned:
                self.buffer.append(cleaned)
                if len(self.buffer) >= self.batch_size:
                    yield self._flush()

    def _cleanse_record(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        event_type = record.get('type')
        if not event_type:
            return None
        if event_type == 'click':
            if not record.get('target'):
                return None
        elif event_type == 'purchase':
            if record.get('amount', 0) <= 0:
                return None
        elif event_type == 'login':
            if not record.get('user_id'):
                return None
        else:
            return None
        return record

    def _flush(self) -> List[Dict[str, Any]]:
        out = list(self.buffer)
        self.buffer.clear()
        return out
