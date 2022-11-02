import { BrowserRouter, Routes, Route } from "react-router-dom"

import TryToSendBitcoin from "./pages/try-to-send-bitcoin";
import SwapTx from "./pages/swap-tx";
import Swap from "./pages/swap";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Swap />} />
                <Route path="/swap/tx/:txid" element={<SwapTx />} />
                <Route path="/swap/try-to-send-bitcoin-again" element={<TryToSendBitcoin />} />
                <Route path="/swap/try-to-send-bitcoin-again/:txid" element={<TryToSendBitcoin />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App;