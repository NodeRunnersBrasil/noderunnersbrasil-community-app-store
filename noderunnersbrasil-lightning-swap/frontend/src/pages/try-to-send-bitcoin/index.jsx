import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PaperPlaneTilt } from "phosphor-react";

import Confirmed from "../../assets/confirmed.json"
import Canceled from "../../assets/canceled.json";
import Loading from "../../assets/loading.json";
import Vincent from "../../lib/vincent";

import Lottie from "lottie-react";

var VITE_VINCENT_BACKEND = window.location.protocol + "//" + window.location.hostname + ":1536"
if ((window.location.href.includes(".onion")) && (import.meta.env.VITE_VINCENT_BACKEND_TOR)) {
  VITE_VINCENT_BACKEND = import.meta.env.VITE_VINCENT_BACKEND_TOR
} else {
  if (import.meta.env.VITE_VINCENT_BACKEND) {
    VITE_VINCENT_BACKEND = import.meta.env.VITE_VINCENT_BACKEND
  }  
}

function TryToSendBitcoin() {
    const { txid } = useParams();

    const [ explorerUrl, setExplorerURL ] = useState("https://blockstream.info/tx/");
    const [ disableButton, setDisableButton ] = useState(false);
    const [ address, setAddress ] = useState("");
    const [ newTxid, setNewTxid ] = useState("")
    const [ amount, setAmount ] = useState(0);
    const [ status, setStatus ] = useState();
    const [ send, setSend ] = useState(null);
    const [ fees, setFees ] = useState(0);
    const [ tx, setTx ] = useState({});

    const navigate = useNavigate();
    const vincent = new Vincent(VITE_VINCENT_BACKEND);

    useEffect(() => {
        if (window.location.href.includes(".onion")) {
            setExplorerURL("http://explorerzydxu5ecjrkwceayqybizmpjjznk5izmitf2modhcusuqlid.onion/tx/")
        }    
    }, [])
    
    useEffect(() => {
        (txid) && vincent.get_lookup(txid).then((r) => {
            const data = r.data;
    
            if (status === "settled") {
                    navigate("/");
            }
    
            else if (data.status !== "reedem") {
                navigate("/");
                
            } else {
                setTx(data);
                setFees(data.fees.service + data.fees.network)
                setAmount(data.to.amount);
                setAddress(data.to.address);
                setStatus(data.status)
            }
        }).catch((r) => {
            console.log("error")
            navigate("/");
        })
    }, [txid])
    
    useEffect(() => {
        if ((txid)) {
            const check_tx = (status === "reedem" && setInterval(() => {
                vincent.get_lookup(txid).then((r) => { 
                    const data = r.data;
                    if (send !== false) {
                        setStatus(data.status);
                        setTx(data);   
    
                        if (status === "settled") {
                            navigate("/");
                        }
                    }
                }).catch(() => {
                    navigate("/");
                })
            }, 5000))
            return () => clearInterval(check_tx);
        }
    }, [tx])

    if ((!txid))  {
        return (
            <div className="container">
                <PaperPlaneTilt size={"15%"} color="#d68120" />
                <div className="box" style={{height: "25%"}}>
                    <p className="label"> Txid </p>
                    <input className="input" value={newTxid} onChange={(e) => {
                        setNewTxid(e.target.value);
                    }}/>
                </div>
                <button 
                    className="try-to-send-bitcoin-again"
                    style={{marginTop: "2.5%"}}
                    disabled={newTxid.length !== 64}
                    onClick={() => {
                    if (newTxid.length === 64) {
                        navigate(`/swap/try-to-send-bitcoin-again/${newTxid}`)
                    }
                }}>
                    Continue
                </button>
            </div>
        )
    }
    
    if ( ( (!tx) || ((disableButton === true) && ((status === "reedem") || (status === "transition")) && (send === null)) ) ) {
        return (
            <div className="container">
                <Lottie 
                    loop={true} 
                    animationData={Loading} style={{ height: 350, width: 350 }} 
                />
            </div>
        )
    }

    if ((status === "settled") || (send === true)) {
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
                    href={`${explorerUrl}${tx.to.txid}`}
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
    
    if ((status === "canceled") || (send === false)) {        
        return (
            <div className="container">
                <Lottie loop={false} animationData={Canceled} style={{ height: 350, width: 350 }} />
                <p> Failed to send the amount, please contact support. </p>
                <button 
                    className="button-go-back"
                    style={{ width: "65%" }}
                    onClick={() => navigate("/")}
                >
                    Go back
                </button>
            </div>
        )
    }
    
    return (
        <div className="container">
            <PaperPlaneTilt size={"15%"} color="#d68120" />

            <div className="box">
                <p className="label"> Amount </p>
                <input className="input" value={amount} style={{color: "white"}} disabled={true}/>
            </div>
            <div className="box">
                <p className="label"> Address </p>
                <input className="input" value={address} style={{color: "white"}} disabled={true} />
            </div>
            <p 
                style={{fontSize: 14, marginLeft: "45%", justifyContent: "center"}}> 
                Fees: {fees} sats
            </p>
            <button 
                className="try-to-send-bitcoin-again" 
                style={{fontSize: 14, marginTop: "5%"}}
                disabled={disableButton}
                onClick={() => {
                    setDisableButton(true);
                    vincent.reedem_swap(txid).then(() => {
                        setStatus("settled");
                        setSend(true);
                    }).catch((r) => {
                        setStatus("canceled");
                        setSend(false);
                    });
                }}
            >
                Try to send bitcoin again!
            </button>
        </div>
    )
}

export default TryToSendBitcoin;