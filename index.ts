import axios from "axios"
import { SendSms } from "./send";

interface Sites {
    Url: string,
    timeOutNum: number
    timeOutSec: number
}
const TimeOutInfo: Map<string, number> = new Map()
const IntervalInfo: Map<string, NodeJS.Timeout> = new Map()
const SendInfo: Map<string, number> = new Map()
const tels = ["15337364316"]
const WebSites: Sites[] = [{
    Url: "http://www.ladis.com.cn",
    timeOutNum: 5,
    timeOutSec: 60
}]



function InterValPing(Url: string, timeOutNum: number, timeOutSec: number) {
    TimeOutInfo.set(Url, 0)
    SendInfo.set(Url, 0)
    const Inter = setInterval(() => {
        axios.get(Url, { timeout: timeOutSec }).then(() => {
            // 网络联通，清除缓存
            TimeOutInfo.set(Url, 0)
            SendInfo.set(Url, 0)
        }).catch(async e => {
            let out = <number>TimeOutInfo.get(Url)
            // 如果超时次数超过设定值，发送短信
            if (out > timeOutNum) {
                let SendNum = <number>SendInfo.get(Url)
                // 如果短信发送次数超过设定值，停止发送
                if (SendNum < 2) {
                    const isSend = SendSms(tels.join(","), Url)
                    // 发送成功，发送计数++
                    if (isSend) {
                        SendInfo.set(Url, SendNum++)
                    }
                    TimeOutInfo.set(Url, 0)
                }
            } else {
                TimeOutInfo.set(Url, out++)
            }
        })
    }, 1000 * 60)
    IntervalInfo.set(Url, Inter)
}

function start() {
    const sites = WebSites
    sites.forEach(el => {
        InterValPing(el.Url, el.timeOutNum, el.timeOutSec)
    })

}

start()

