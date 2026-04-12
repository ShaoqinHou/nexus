#!/bin/bash
# Usage: ./restore.sh [backup-filename]
#   No argument  → lists available backups
#   With argument → restores that backup (replaces current DB)
set -e

DB_PATH="${DATABASE_PATH:-./data/nexus.db}"
BACKUP_DIR="$(dirname "$DB_PATH")/backups"

# List mode: no argument provided
if [ -z "$1" ]; then
  if [ ! -d "$BACKUP_DIR" ]; then
    echo "No backups directory found at $BACKUP_DIR"
    exit 0
  fi

  BACKUPS=$(ls -t "$BACKUP_DIR"/nexus-*.db 2>/dev/null)
  if [ -z "$BACKUPS" ]; then
    echo "No backups found in $BACKUP_DIR"
    exit 0
  fi

  echo "Available backups (newest first):"
  echo "$BACKUPS" | while read -r f; do
    SIZE=$(du -sh "$f" | cut -f1)
    FNAME=$(basename "$f")
    echo "  $FNAME  ($SIZE)"
  done
  echo ""
  echo "Usage: db:restore <filename>  e.g.  npm run db:restore -- nexus-2026-04-12.db"
  exit 0
fi

# Restore mode: argument is a backup filename (basename only) or full path
BACKUP_TARGET="$1"

# If only a filename was given (no directory), prepend the backup dir
if [ "$(dirname "$BACKUP_TARGET")" = "." ]; then
  BACKUP_TARGET="$BACKUP_DIR/$BACKUP_TARGET"
fi

if [ ! -f "$BACKUP_TARGET" ]; then
  echo "ERROR: Backup file not found: $BACKUP_TARGET" >&2
  exit 1
fi

# Safety: create a pre-restore snapshot of the current DB if it exists
if [ -f "$DB_PATH" ]; then
  PRE_RESTORE="$BACKUP_DIR/nexus-pre-restore-$(date +%Y-%m-%dT%H-%M-%S).db"
  mkdir -p "$BACKUP_DIR"
  cp "$DB_PATH" "$PRE_RESTORE"
  echo "Safety snapshot saved: $PRE_RESTORE"
fi

# Perform restore
cp "$BACKUP_TARGET" "$DB_PATH"
echo "Restored: $(basename "$BACKUP_TARGET") → $DB_PATH"
exit 0
