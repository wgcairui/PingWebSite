import { isArray } from "util";
import core from "@alicloud/pop-core"
const key = require("./key.json")

interface SmsResult {
    "Message": string
    "RequestId": string
    "BizId": string
    "Code": string
}

// 阿里云SMS文档
// https://api.aliyun.com/?spm=a2c4g.11186623.2.21.79af50a4cYSUsg#/?product=Dysmsapi&version=2017-05-25&api=AddSmsSign&params={%22RegionId%22:%22default%22}&tab=DEMO&lang=NODEJS

const client = new core(
    {
        accessKeyId: key.accessKeyId,
        accessKeySecret: key.accessKeySecret,
        endpoint: 'https://dysmsapi.aliyuncs.com',
        apiVersion: '2017-05-25'
    }
)

const requestOption = {
    method: 'POST'
};

// 申请签名
export const AddSmsSign = () => {
    const params = {
        "RegionId": "cn-hangzhou",
        "SignName": "雷迪司科技湖北有限公司",
        "SignSource": 1,
        "Remark": "用于监测我司官网主机是否在线，离线发送告警短信"
    }

    client.request('AddSmsSign', params, requestOption).then(result => {
        console.log({ AddSmsSign: result });

    }).catch(e => {
        console.log(e);

    })
}

//查询签名状态
export const QuerySmsSign = () => {
    const params = {
        "RegionId": "cn-hangzhou",
        "SignName": "雷迪司科技湖北有限公司"
    }
    client.request('QuerySmsSign', params, requestOption).then((result) => {
        console.log({ QuerySmsSign: result });
    }, (ex) => {
        console.log(ex);
    })
}


// 申请模板
export const AddSmsTemplate = () => {
    const params = {
        "RegionId": "cn-hangzhou",
        "TemplateType": 1,
        "TemplateName": "网站下线提醒",
        "TemplateContent": "监测到网站${url}离线，离线时间${time},请尽快处理",
        "Remark": "监测我司网站离线，以提醒运维处理"
    }
    client.request('AddSmsTemplate', params, requestOption).then((result) => {
        console.log({ AddSmsTemplate: result });
    }, (ex) => {
        console.log(ex);
    })
}

// 查询模板状态
export const QuerySmsTemplate = () => {
    var params = {
        "RegionId": "cn-hangzhou",
        "TemplateCode": "网站下线提醒"
    }

    client.request('QuerySmsTemplate', params, requestOption).then((result) => {
        console.log({ QuerySmsTemplate: result });
    }, (ex) => {
        console.log(ex);
    })
}

// 单条发送短信
type alarmType = "error" | "success"
export const SendSms = async (tels: string, sitename: string, type: alarmType) => {
    const smsCode = {
        success: "SMS_185846200",
        error: "SMS_185820818"
    }
    const time = new Date().toLocaleString()
    const TemplateParam = JSON.stringify({ sitename: `[${sitename}]`, time })
    console.log(TemplateParam);
    
    const params = {
        "RegionId": "cn-hangzhou",
        "PhoneNumbers": tels,
        "SignName": "雷迪司科技湖北有限公司",
        "TemplateCode": smsCode[type],
        TemplateParam
    }

    const result: SmsResult = await client.request('SendSms', params, requestOption)
    console.log(result);

    if (result.Code === "OK") {
        return true
    } else {
        console.log(result);
        return false
    }

}
