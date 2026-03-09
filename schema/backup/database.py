import subprocess
import gzip
import os
import datetime
import sys

# ===== CONFIG =====

CONTAINER_NAME = "postgres_target"   # container postgres máy đích
DB_USER = "admin"
DB_NAME = "postgres"

BACKUP_FILES = [
    "backup/hethong_phantich_chungkhoan.sql.gz",
    "backup/system.sql.gz"
]

# ==================


def log(message):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] {message}")
    sys.stdout.flush()


def restore_schema(file_path):

    schema_name = os.path.basename(file_path).replace(".sql.gz", "")

    log(f"Start restoring schema: {schema_name}")
    log(f"Source file: {file_path}")

    cmd = [
        "docker",
        "exec",
        "-i",
        CONTAINER_NAME,
        "psql",
        "-U",
        DB_USER,
        "-d",
        DB_NAME
    ]

    log("Command: " + " ".join(cmd))

    try:

        process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        with gzip.open(file_path, "rb") as f:

            total = 0

            while True:
                chunk = f.read(8192)
                if not chunk:
                    break

                process.stdin.write(chunk)
                total += len(chunk)

                if total % (50 * 1024 * 1024) < 8192:
                    log(f"{schema_name}: restored {round(total/1024/1024,2)} MB")

        process.stdin.close()

        stdout, stderr = process.communicate()

        if process.returncode != 0:
            log("ERROR during restore")
            log(stderr.decode())
            return

        log(f"Finished restore schema: {schema_name}")

    except Exception as e:
        log(f"Exception: {e}")


def main():

    log("===== START RESTORE =====")

    for file in BACKUP_FILES:
        restore_schema(file)

    log("===== RESTORE FINISHED =====")


if __name__ == "__main__":
    main()