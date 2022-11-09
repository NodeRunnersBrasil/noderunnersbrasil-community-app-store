import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Timer, Lightning } from "phosphor-react";
import Vincent from "../../lib/vincent";
import Lottie from "lottie-react";

import Confirmed from "../../assets/confirmed.json"
import Canceled from "../../assets/canceled.json";
import Loading from "../../assets/loading.json";
import Alert from "../../assets/alert.json";

import "./styles.css"

var VITE_VINCENT_BACKEND = window.location.protocol + "//" + window.location.hostname + ":1536"
if ((window.location.href.includes(".onion")) && (import.meta.env.VITE_VINCENT_BACKEND_TOR)) {
  VITE_VINCENT_BACKEND = import.meta.env.VITE_VINCENT_BACKEND_TOR
} else {
  if (import.meta.env.VITE_VINCENT_BACKEND) {
    VITE_VINCENT_BACKEND = import.meta.env.VITE_VINCENT_BACKEND
  }  
}

function SwapTx() {
    const { txid } = useParams();
    const [ tx, setTx ] = useState({});
    const [ explorerUrl, setExplorerURL ] = useState("https://blockstream.info/tx/");

    const [ invoice, setInvoice ] = useState("");
    const [ counter, setCounter ] = useState(-1);
    const [ amount, setAmount ] = useState(0);
    const [ status, setStatus ] = useState();
    
    const navigate = useNavigate()
    const vincent = new Vincent(VITE_VINCENT_BACKEND);

    useEffect(() => {
        if (window.location.href.includes(".onion")) {
            setExplorerURL("http://explorerzydxu5ecjrkwceayqybizmpjjznk5izmitf2modhcusuqlid.onion/tx/")
        }    
    }, [])
    
    useEffect(() => {
        vincent.get_lookup(txid).then((r) => {
            const data = r.data;
            const now = Math.floor(Date.now() / 1000)

            setTx(data);
            if ( counter === -1 ) { 
                setCounter(Number(((data.created_at + data.expiry) - now).toFixed(0)));
            }
            setAmount(data.from.amount)
            setInvoice(data.from.invoice);
            setStatus(data.status)
        }).catch((r) => {
            navigate("/")
        })
    }, [txid]);

    useEffect(() => {
        if ((tx.expiry) && (counter === -1)) {
            setCounter(tx.expiry)
        }

        if ( counter >= 1 ) {
            const now = Math.floor(Date.now() / 1000)
            const timer = counter > 0 && setInterval(() => setCounter(((tx.created_at + tx.expiry) - now).toFixed(0)), 1000);
            return () => clearInterval(timer);
        }

    }, [counter]);

    useEffect(() => {
        const check_tx = (status === "pending" && setInterval(() => {
            vincent.get_lookup(txid).then((r) => { 
                const data = r.data
                setTx(data);
                setStatus(data.status);
            })
        }, 5000))
        return () => clearInterval(check_tx);
    }, [tx])

    if (!invoice) {
        return (
            <div className="container" style={{boxShadow: "none"}}>
                <Lottie animationData={Loading} style={{ height: 350, width: 350 }}/>
            </div>
        );
    }
    
    if (status === "reedem") {
        return (
            <div className="container">
                <Lottie loop={false} animationData={Alert} style={{ height: 350, width: 350 }} />
                <p style={{width: "65%", wordBreak: "break-all", }}> 
                    Your transaction cannot be processed due to a problem on our side, 
                    please try to send the payment later using the button below.
                </p>
                <button className="try-to-send-bitcoin-again" onClick={() => navigate(`/swap/try-to-send-bitcoin-again/${txid}`)}> 
                    Try to send bitcoin again!
                </button>
            </div>
        )
    }
    
    if (status === "settled") {
        return (
            <div className="container">
                <Lottie 
                    loop={false}
                    autoplay={true}
                    animationData={Confirmed} 
                    style={{ height: 350, width: 350 }}
                />
                <a 
                    style={{ 
                        width: "75%", 
                        wordBreak: "break-all", 
                        textDecoration: "inherit", 
                        color: "white"
                    }} 
                    target="_blank"
                    href={`${explorerUrl}${txid}`}
                > 
                    <i>{tx.to.txid}</i>
                </a>
                <button 
                    class="button-go-back" 
                    style={{marginTop: "5%", width: "75%"}}
                    onClick={() => navigate("/")}
                >
                    Go back
                </button>
            </div>
        )
    }

    if ((counter <= 0)) {
        return (
            <div className="container">
                <Lottie loop={false} animationData={Canceled} style={{ height: 350, width: 350 }} />
                <p> Your transaction has been cancelled. </p>
                <button 
                    className="button-go-back"
                    onClick={() => navigate("/")}
                >
                    Go back
                </button>
            </div>
        )
    }
    
    return (
        <div className="container">
            <div 
                style={{
                    display: "flex", 
                    flexDirection: "row", 
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                }}>
                {
                    counter !== -1 ? (
                        <p> Expires in {counter}s </p>
                    ) : (
                        <p> Time's up </p>
                    )
                }   
                <Timer size={18} weight="duotone" style={{paddingLeft: "1.5%"}}/>
            </div>

            <a href={`lightning:${invoice}`} style={{ width: "90%", marginLeft: "10%"}}>
                <QRCodeSVG 
                    value={`lightning:${invoice}`} 
                    height={"90%"}
                    width={"90%"}
                    bgColor="#2E3336"
                    fgColor="white"
                    includeMargin={true}
                    level="H"
                />
            </a>
            <div 
                style={{
                    display: "flex", 
                    flexDirection: "row", 
                    width: "100%", 
                    alignItems: "baseline",
                    justifyContent: "center",
                    fontSize: "13px"
                }}
            >
                <input value={invoice} disabled={true} style={{
                    width: "25%", 
                    background: "none",
                    border: "none",
                    outline: "none",
                    marginBottom: "15%",
                }}/>
                <div style={{ marginLeft: "2%", display: "flex", flexDirection: "row"}}>
                    ~ {parseFloat(amount).toLocaleString('en-US', {style: 'decimal'})}
                    <Lightning  size={19} color="yellow" weight="fill" />
                </div>
            </div>

        </div>
    )
}

export default SwapTx;
