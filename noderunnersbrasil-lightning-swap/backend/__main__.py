from dotenv import load_dotenv
from os import environ

# Loads the variables of environments in the .env file
# of the current directory.
load_dotenv(environ.get("ENV_PATH", ".env"))

from services.lightning import lnbits
from services.redis import redis
from services.lnd import lnd 
from configs import PATH, LNBITS_HOST
from json import dumps

import requests
import logging
import sys
import api

logging.info(f"Configuration {PATH}/.env")
logging.info("Checking if the node is online.")
try:
    get_info = lnd.get_info()
    print(dumps(get_info, indent=3))
except:
    logging.critical("Unable to start the service because your node is not online or your instance has been misconfigured.")
    logging.critical("Exit")
    sys.exit(0)

try:
    get_wallet = lnbits.get_wallet()
    print(dumps(get_wallet, indent=3))
except:
    logging.critical("Lnbits service unavailable.")
    logging.critical("Exit")
    sys.exit(0)

try:
    redis.ping()
except:
    logging.critical("Redis service unavailable.")
    logging.critical("Exit")
    sys.exit(0)

# Initialize swap application API.
api.start()
