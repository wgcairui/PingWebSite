import axios from "axios"
import { SendSms } from "./send";

interface Sites {
    Url: string,
    UrlName: string
    timeOutNum: number
    tels: string[]
}
const TimeOutInfo: Map<string, number> = new Map()
const IntervalInfo: Map<string, NodeJS.Timeout> = new Map()
const SendInfo: Map<string, number> = new Map()
const WebSites: Sites[] = [{
    Url: "http://www.ladishb.com",
    UrlName: "湖北雷迪司网站",
    timeOutNum: 5,
    tels: ["15337364316"]
},{
    Url:"http://www.ladis.com.cn",
    UrlName:"雷迪司官网",
    timeOutNum:5,
    tels:["17371676835","13705817726","15337364316"]
}]



// 每分钟沦陷get，计数${timeOutNum}次发送一次告警短信，告警短信发送两次之后停止发送，恢复连接之后发送短信提醒
function InterValPing(Info: Sites) {
    const { Url, tels } = Info
    console.log(`注册 ${Url} 监听`);
    TimeOutInfo.set(Url, 0)
    SendInfo.set(Url, 0)
    const Inter = setInterval(() => {
        axios.get(Url).then(() => {
            console.log(`连接网址${Url} Success,########${new Date().toLocaleString()}`);
            if (SendInfo.get(Url) as number > 0) SendSms(tels.join(","), Info.UrlName, "success")
            // 网络联通，清除缓存
            TimeOutInfo.set(Url, 0)
            SendInfo.set(Url, 0)
        }).catch(async () => {
            let out = <number>TimeOutInfo.get(Url)
            console.log(`连接网址${Url} error,num计数:${out} ,########${new Date().toLocaleString()}`);
            // 如果超时次数超过设定值，发送短信
            if (out > Info.timeOutNum -1) {
                let SendNum = <number>SendInfo.get(Url)
                // 如果短信发送次数超过设定值，停止发送
                if (SendNum < 2) {
                    console.log(`发送错误to${tels.join(",")}`);
                    const isSend = SendSms(tels.join(","), Info.UrlName, "error")
                    // 发送成功，发送计数++
                    if (isSend) {
                        SendNum++
                        SendInfo.set(Url, SendNum)
                    }
                    TimeOutInfo.set(Url, 0)
                } else {
                    out++
                    TimeOutInfo.set(Url, out)
                }
            } else {
                out++
                TimeOutInfo.set(Url, out)
            }
        })
    }, 1000 * 60)
    IntervalInfo.set(Url, Inter)
}

function start() {
    const sites = WebSites
    sites.forEach(el => {
        InterValPing(el)
    })

}

start()

