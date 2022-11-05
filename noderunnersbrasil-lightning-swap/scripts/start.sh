#!/bin/bash

cat <<EOF
 _______ _________ _______  _______ _________
(  ____ \\__   __/(  ___  )(  ____ )\__   __/
| (    \/   ) (   | (   ) || (    )|   ) (   
| (_____    | |   | (___) || (____)|   | |   
(_____  )   | |   |  ___  ||     __)   | |   
      ) |   | |   | (   ) || (\ (      | |   
/\____) |   | |   | )   ( || ) \ \__   | |   
\_______)   )_(   |/     \||/   \__/   )_(   
EOF

echo -e ""

export $(grep -v '^#' .env | xargs) >> /dev/null 2>&1 

if [ -z ${VITE_TITLE+x} ]; then
    export VITE_TITLE="LN Swap"
fi

if [ -z ${LNBITS_MAIN_WALLET_ADMIN_KEY+x} ]; then
    LNBITS_URL=$(echo $LNBITS_HOST | awk '{gsub("/api",""); print}')"/wallet?nme=default"
    LNBITS_URL=$(echo $LNBITS_URL | awk '{gsub("host.docker.internal","127.0.0.1"); print}')
    LNBITS_WALLET_URL=$(curl -X GET --head --silent --write-out "%{redirect_url}\n" --output /dev/null $LNBITS_URL)
    LNBITS_WALLET_SOURCE=$(curl -L -s -w "\n%{http_code}" "${LNBITS_WALLET_URL}")
    LNBITS_WALLET_KEYS=$(echo $LNBITS_WALLET_SOURCE | python3 -c 'import sys, json, re; print(re.search(r"window\.wallet = ({.*});", sys.stdin.read()).group(1))')

    LNBITS_MAIN_WALLET_ADMIN_KEY=$(echo $LNBITS_WALLET_KEYS | jq .adminkey) 
    LNBITS_MAIN_WALLET_INVOICE_KEY=$(echo $LNBITS_WALLET_KEYS | jq .inkey)

    echo $LNBITS_WALLET_URL > ./lnbits.url
    echo "" >> .env
    echo "LNBITS_MAIN_WALLET_ADMIN_KEY=${LNBITS_MAIN_WALLET_ADMIN_KEY}" >> .env
    echo "LNBITS_MAIN_WALLET_INVOICE_KEY=${LNBITS_MAIN_WALLET_INVOICE_KEY}" >> .env
fi

docker-compose --env-file .env up -d
clear 

FRONTEND_URL="http://"$(hostname)":5173"

cat <<EOF

LL      NN   NN   SSSSS  WW      WW   AAA   PPPPPP  
LL      NNN  NN  SS      WW      WW  AAAAA  PP   PP 
LL      NN N NN   SSSSS  WW   W  WW AA   AA PPPPPP  
LL      NN  NNN       SS  WW WWW WW AAAAAAA PP      
LLLLLLL NN   NN   SSSSS    WW   WW  AA   AA PP     

URL:  ${FRONTEND_URL}
EOF

echo -e ""