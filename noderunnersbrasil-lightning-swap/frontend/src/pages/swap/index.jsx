import { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { percentage } from "../../helpers";
import Vincent from "../../lib/vincent";
import Onion from "../../assets/onion.png"
import './index.css';

var VITE_TITLE = "LN Swap"
if (import.meta.env.VITE_TITLE) {
  VITE_TITLE = import.meta.env.VITE_TITLE
  document.title = VITE_TITLE;
}

var VITE_VINCENT_BACKEND = window.location.protocol + "//" + window.location.hostname + ":1536"
if ((window.location.href.includes(".onion")) && (import.meta.env.VITE_VINCENT_BACKEND_TOR)) {
  VITE_VINCENT_BACKEND = import.meta.env.VITE_VINCENT_BACKEND_TOR
} else {
  if (import.meta.env.VITE_VINCENT_BACKEND) {
    VITE_VINCENT_BACKEND = import.meta.env.VITE_VINCENT_BACKEND
  }  
}

function Swap() {
  const [ disableButton, setDisableButton ] = useState(true);
  const [ feeEstimate, setfeeEstimate ] = useState(0);
  const [ minAmount, setMinAmount ] = useState(0);
  const [ maxAmount, setMaxAmount ] = useState(0);
  const [ liquidity, setLiquidity ] = useState(false);
  const [ available, setAvailable ] = useState(false);
  const [ service, setService ] = useState(0);
  const [ address, setAddress ] = useState("");
  const [ feerate, setFeerate ] = useState(1)
  const [ amount, setAmount ] = useState(0);
  const [ torUrl, setTorUrl ] = useState("http://notyetset.onion");
  const [ total, setTotal ] = useState(0);

  const navigate = useNavigate();
  const vincent = new Vincent(VITE_VINCENT_BACKEND);

  function createNewSwap() {
    setDisableButton(true);
    
    vincent.create_swap(address, amount, feerate).then((r) => {
      const { id } = r.data
      navigate(`/swap/tx/${id}`)
    }).catch((r) => {
      setLiquidity(false);
    })
  }
  
  useEffect(() => {
    var value = (feeEstimate * feerate) + Number(amount)
    value += percentage(amount, service)
    setTotal(value)
  }, [amount, feerate, feeEstimate])
  
  useEffect(() => {
    vincent.get_info().then((r) => {
      const data = r.data;
      console.log(data)
      setMinAmount(data.swap.min_amount);
      setMaxAmount(data.swap.max_amount);
      setService(data.fees.service);
      if (data.available === true) {
        setLiquidity(true);
      }

      if (data.mirrors.tor.length >= 1) {
        setTorUrl(data.mirrors.tor.slice(-1).pop());
      }
      setAvailable(data.available);
    })
  }, [])
  
  useEffect(() => {
    if ((available === false)) {
      setLiquidity(false);
    }

    if ((address.length >= 32) && (address.slice(0, 2) === "bc") && (feerate >= 1) && (amount >= minAmount) && (amount <= maxAmount) && (available == true) && (liquidity === true)) {
      setDisableButton(false);
    } else {
      setDisableButton(true);
    }

    if ((address.length >= 32) && (address.slice(0, 2) === "bc") && (amount >= minAmount)) {
      vincent.get_estimate_fee(address, amount).then((r) => {
        const data = r.data;
        setfeeEstimate(data.fees);
        setLiquidity(true);
      }).catch((r) => {
        setLiquidity(false);
        setDisableButton(true);
      })
    }
  }, [address, feerate, amount])

  return (
    <div style={{width: "100%", height: "95%"}}>
      
      <div className="container">
        <a 
          style={{
            display: "flex", 
            left: "80%", 
            top: "5%", 
            height: "10%",
            width: "12%",
            position: "absolute", 
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textDecoration: "inherit", 
          }}
          target="_blank"
          href={torUrl}
          >
          <img className="icon-onion" src={Onion} />
        </a>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
          <h1 className="title"> {VITE_TITLE} </h1>
        </div>
        
        <div className="box">
          <p className="label"> Amount </p>
          <input 
            className="input" 
            placeholder={minAmount} 
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />        
        </div>
        
        <div className="box">
          <p className="label"> Address </p>
          <input 
            className="input" 
            placeholder="Address" 
            value={address}
            style={{paddingRight: "1%"}}
            onChange={(e) => {
              const value = e.target.value;
              setAddress(value);
            }}
          />        
        </div>
        
        <div className="feerate">
          <input 
            className="range" 
            type="range" 
            min="1" 
            max="100" 
            defaultValue={feerate}
            onChange={(e) => setFeerate(e.target.value)}
          />
          <p  className="label-total-fees"> 
            ({feerate} sat/vbyte) Total: { parseFloat(total).toLocaleString('en-US', {style: 'decimal'}) } sats
          </p>
        </div>
        
        <button className="continue" disabled={disableButton} onClick={createNewSwap}> 
          Continue
        </button>
        {
          (liquidity === false) ? (
            <p style={{fontSize: 14, color: "#a02e30", marginTop: "3%", marginBottom: "2%", }}> 
              Sorry service unavailable!
            </p>
          ) : (
            <a 
              style={{fontSize: 14, marginTop: "3%", marginBottom: "2%", textDecoration: "inherit", color: "#474c51" }} 
              href="/swap/try-to-send-bitcoin-again"
            > 
              Try to send bitcoin again!
            </a>
          )
        }
      </div>
    </div>
  )
}

export default Swap;
