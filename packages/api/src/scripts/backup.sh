#!/bin/bash
set -e

DB_PATH="${DATABASE_PATH:-./data/nexus.db}"
BACKUP_DIR="$(dirname "$DB_PATH")/backups"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/nexus-$DATE.db"

# Verify source database exists
if [ ! -f "$DB_PATH" ]; then
  echo "ERROR: Database not found at $DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# Use sqlite3 online backup if available, fall back to cp
if command -v sqlite3 &> /dev/null; then
  sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
  echo "Backup created (sqlite3 .backup): $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"
else
  cp "$DB_PATH" "$BACKUP_FILE"
  echo "Backup created (cp fallback): $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"
fi

# Keep last 30 backups, delete older ones
cd "$BACKUP_DIR"
BACKUP_COUNT=$(ls -1 nexus-*.db 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 30 ]; then
  TO_DELETE=$(ls -t nexus-*.db | tail -n +31)
  echo "$TO_DELETE" | xargs -r rm --
  DELETED=$(echo "$TO_DELETE" | wc -l)
  echo "Cleanup: removed $DELETED old backup(s), kept 30 most recent"
else
  echo "Cleanup: $BACKUP_COUNT backup(s) present, no cleanup needed"
fi

exit 0
