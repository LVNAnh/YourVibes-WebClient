import { Privacy } from "@/api/baseApiResponseModel/baseApiResponseModel"; 

export interface CreateCommentsRequestModel {
    
    content: string; 
    parent_id?: string | null;  
    post_id: string; 
    Privacey?: Privacy;   
}
