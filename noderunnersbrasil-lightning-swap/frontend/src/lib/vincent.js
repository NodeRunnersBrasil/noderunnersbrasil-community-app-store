import axios from "axios";

class Vincent {

    constructor(url) {
        this.url = url
    }

    call(method, path, data) {
        return axios({ method: method, url: this.url + path, data: data })
    }

    get_info() {
        return this.call("GET", "/api/v1/info")
    }

    get_estimate_fee(address, amount, feerate = 1) {
        const query = `?address=${address}&amount=${amount}&feerate=${feerate}`
        return this.call("GET", "/api/v1/estimate/fee" + query)
    }

    get_lookup(txid) {
        return this.call("GET", `/api/v1/lookup/${txid}`)
    }
    
    create_swap(address, amount, feerate) {
        const data = {"address": address, "amount": amount, "feerate": feerate}
        return this.call("POST", "/api/v1/swap/create", data)
    }

    reedem_swap(txid) {
        const data = {"txid": txid}
        return this.call("POST", "/api/v1/reedem", data)
    }
}

export default Vincent;