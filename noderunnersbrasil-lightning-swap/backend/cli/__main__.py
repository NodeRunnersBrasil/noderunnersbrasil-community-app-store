from os.path import expanduser
from tinydb import TinyDB, Query
from time import time
from json import dumps

import click

database = TinyDB(expanduser("~/vinci") + "/data/database.db")

@click.group()
def cli():
    ...

@cli.command()
@click.option("--daily", is_flag=True, help="Generate a daily report.")
def report(daily: bool):
    if (daily == True):        
        # Get data to build report.
        timestamp = int(time())
        time_last_24 = int(timestamp - (60 * 60) * 24)
        report_daily = database.search(
            (Query().created_at >= time_last_24) & 
            (Query().created_at <= timestamp)
        )
        total_volume = 0
        
        counts_canceled = 0
        counts_settled = 0
        counts_reedem = 0

        total_fees_profit = 0
        total_count = 0
        total_fees = 0

        for tx in report_daily:
            if (tx["status"] == "settled"):
                counts_settled += 1
            
            elif (tx["status"] == "canceled"):
                counts_canceled += 1

            elif (tx["status"] == "reedem"):
                counts_reedem += 1
            
            total_fees_profit += tx["fees"]["service"]
            total_volume += tx["to"]["amount"]
            total_count += 1
            total_fees += tx["fees"]["network"] + tx["fees"]["service"]
        
        report = {
            "volume": total_volume, 
            "counts": {
                "settled":  counts_settled,
                "canceled": counts_canceled,
                "reedem": counts_reedem,
                "total":    total_count,
            },
            "fees": {
                "profit": total_fees_profit,
                "total": total_fees
            },
            "date": {
                "from": time_last_24,
                "to": timestamp
            }
        }
        print(dumps(report, indent=3))
    
if __name__ == "__main__":
    cli()