import subprocess
import gzip
import os
import datetime
import sys

CONTAINER_NAME = "dwh-postgres"
DB_USER = "admin"
DB_NAME = "postgres"
password = '123456'
SCHEMAS = [
    "hethong_phantich_chungkhoan",
    "system"
]

OUTPUT_DIR = "./backup"


def log(message):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] {message}")
    sys.stdout.flush()


def dump_schema(schema):

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    output_file = os.path.join(OUTPUT_DIR, f"{schema}.sql.gz")

    log(f"Start dumping schema: {schema}")

    cmd = [
        "docker",
        "exec",
        "-i",
        CONTAINER_NAME,
        "pg_dump",
        "-U", DB_USER,
        "-d", DB_NAME,
        "-n", schema,
        "--no-owner"
    ]

    log("Command: " + " ".join(cmd))

    try:

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        with gzip.open(output_file, "wb") as gz_file:

            total_bytes = 0

            while True:
                chunk = process.stdout.read(8192)
                if not chunk:
                    break

                gz_file.write(chunk)
                total_bytes += len(chunk)

                if total_bytes % (50 * 1024 * 1024) < 8192:
                    log(f"{schema}: dumped {round(total_bytes/1024/1024,2)} MB")

        stderr = process.stderr.read().decode()

        process.wait()

        if process.returncode != 0:
            log(f"ERROR dumping {schema}")
            log(stderr)
            return

        log(f"Finished {schema}")
        log(f"Compressed file: {output_file}")
        log(f"Size written: {round(total_bytes/1024/1024,2)} MB")

    except Exception as e:
        log(f"Exception: {e}")


def main():

    log("===== START BACKUP =====")

    for schema in SCHEMAS:
        dump_schema(schema)

    log("===== BACKUP FINISHED =====")


if __name__ == "__main__":
    main()