#!/bin/bash

UMBREL_HOST=$(echo $(hostname -s 2>/dev/null)".local")

touch ${EXPORTS_APP_DIR}/.env
export $(grep -v '^#' ${EXPORTS_APP_DIR}/.env | xargs) >> /dev/null 2>&1 

export APP_LN_SWAP_BACKEND_IP=10.21.21.38
export APP_LN_SWAP_BACKEND_PORT=1536

export APP_LN_SWAP_FRONTEND_IP=10.21.21.65
export APP_LN_SWAP_FRONTEND_PORT=5173

export VITE_VINCENT_BACKEND=http://${UMBREL_HOST}:1536
export VITE_TITLE="LN Swap"

# Redis configuration.
if [ -z ${REDIS_PASS+x} ]; then
    export REDIS_PASS="password"
fi

# Lnd configuration.
if [ -z ${LND_HOST+x} ]; then
    export LND_HOST="https://host.docker.internal:8080"
fi

if [ -z ${LND_MACAROON+x} ]; then
    export LND_MACAROON=$(sudo xxd -ps -u -c 1000 "$UMBREL_ROOT/app-data/lightning/data/lnd/data/chain/bitcoin/${APP_BITCOIN_NETWORK}/admin.macaroon")
fi

# Swap configuration.
if [ -z ${SWAP_SERVICE_FEERATE+x} ]; then
    export SWAP_SERVICE_FEERATE=0.5
fi

if [ -z ${SWAP_MIN_AMOUNT+x} ]; then
    export SWAP_MIN_AMOUNT=10000
fi

if [  -z ${SWAP_MAX_AMOUNT+x} ]; then
    export SWAP_MAX_AMOUNT=100000000
fi

export LNBITS_HOST="http://host.docker.internal:3007/api"
export LNBITS_WEBHOOK_URL="http://${APP_LN_SWAP_BACKEND_IP}:${APP_LN_SWAP_BACKEND_PORT}/api/v1/lnbits/webhook"

if [ -z ${LNBITS_MAIN_WALLET_ADMIN_KEY+x} ]; then
    LNBITS_WALLET_URL=$(curl -X GET --head --silent --write-out "%{redirect_url}\n" --output /dev/null http://${UMBREL_HOST}:3007/wallet?nme=default)
    LNBITS_WALLET_SOURCE=$(curl -L -s -w "\n%{http_code}" "${LNBITS_WALLET_URL}")
    LNBITS_WALLET_KEYS=$(echo $LNBITS_WALLET_SOURCE | python3 -c 'import sys, json, re; print(re.search(r"window\.wallet = ({.*});", sys.stdin.read()).group(1))')

    LNBITS_MAIN_WALLET_ADMIN_KEY=$(echo $LNBITS_WALLET_KEYS | jq .adminkey) 
    LNBITS_MAIN_WALLET_INVOICE_KEY=$(echo $LNBITS_WALLET_KEYS | jq .inkey)

    echo $LNBITS_WALLET_URL > ${EXPORTS_APP_DIR}/lnbits.url
    
    echo "LNBITS_HOST=${LNBITS_HOST}" >> ${EXPORTS_APP_DIR}/.env
    echo "LNBITS_MAIN_WALLET_ADMIN_KEY=${LNBITS_MAIN_WALLET_ADMIN_KEY}" >> ${EXPORTS_APP_DIR}/.env
    echo "LNBITS_MAIN_WALLET_INVOICE_KEY=${LNBITS_MAIN_WALLET_INVOICE_KEY}" >> ${EXPORTS_APP_DIR}/.env
fi

tor_hidden_service=$(cat "${EXPORTS_TOR_DATA_DIR}/app-${EXPORTS_APP_ID}/hostname")
if [ -z ${MIRRORS_TOR_URL+x} ]; then
    export MIRRORS_TOR_URL="http://${tor_hidden_service}"
    echo "MIRRORS_TOR_URL=${MIRRORS_TOR_URL}" >> ${EXPORTS_APP_DIR}/.env
fi

echo $tor_hidden_service > ${EXPORTS_APP_DIR}/tor.url