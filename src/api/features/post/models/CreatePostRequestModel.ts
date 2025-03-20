import { Privacy } from "@/api/baseApiResponseModel/baseApiResponseModel"
import { RcFile } from "antd/es/upload"


export interface CreatePostRequestModel {
    content?: string
    privacy?: Privacy
    location?: string
    media?: RcFile[]
}