import os
import requests

BASE_URL = os.getenv(
    "AURA_BACKEND_URL",
    "https://knowledge-graph-backend-production.up.railway.app"
).rstrip("/")

# All dataset graph endpoints
DATASETS = [
    "cluster1",
    "cluster2",
    "cluster3",
    "cluster4",
    "cluster5",
    "cluster6",
    "eic",
    "eie",
    "erc",
    "infra",
    "msca",
    "missions",
    "widera",
    "dep",
    "erasmus",
    "euratom",
    "cef",
    "crea"
]


def delete_graphs():
    print("\nDeleting existing graphs...\n")

    for dataset in DATASETS:
        url = f"{BASE_URL}/{dataset}/all"

        try:
            r = requests.delete(url)
            print(f"DELETE {url} -> {r.status_code}")
        except Exception as e:
            print(f"ERROR deleting {dataset}: {e}")


def populate_graphs():
    print("\nPopulating graphs...\n")

    for dataset in DATASETS:
        url = f"{BASE_URL}/{dataset}/populate"

        try:
            r = requests.post(url, json={})
            print(f"POST {url} -> {r.status_code}")
        except Exception as e:
            print(f"ERROR populating {dataset}: {e}")


def main():
    print("\n===============================")
    print(" EU GRAPHS AURA POPULATION JOB ")
    print("===============================\n")

    delete_graphs()
    populate_graphs()

    print("\nFinished populating Aura graphs.\n")


if __name__ == "__main__":
    main()