"""
HireSense AI CLI Runner
Enables direct invocation from command line or subprocess.
Usage:
  python -m AI.cli --title "Frontend Lead" --company "HireSense" --desc "..." --salary "..."
"""

import sys
import argparse
import asyncio
import json

from AI.structuring_service import generate_structured_listing

def main():
    parser = argparse.ArgumentParser(description="HireSense AI Job Listing Structurer")
    parser.add_argument("--title", required=True, help="Job title")
    parser.add_argument("--company", required=True, help="Company name")
    parser.add_argument("--desc", required=True, help="Job description raw text")
    parser.add_argument("--salary", default="", help="Salary raw text")

    args = parser.parse_args()

    async def run():
        listing, model, ver = await generate_structured_listing(
            title=args.title,
            company=args.company,
            description=args.desc,
            salary=args.salary,
        )
        output = {
            "structured": listing.model_dump(),
            "model_name": model,
            "prompt_version": ver,
        }
        # Print JSON to stdout in UTF-8
        sys.stdout.buffer.write(json.dumps(output, ensure_ascii=False).encode("utf-8"))
        sys.stdout.buffer.write(b"\n")

    asyncio.run(run())

if __name__ == "__main__":
    main()

