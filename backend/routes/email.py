from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.text import MIMEText
import os
smtp_user = os.getenv("SMTP_USER")
smtp_pass = os.getenv("SMTP_PASS")
router = APIRouter()

class EmailRequest(BaseModel):
    to: EmailStr
    message: str

@router.post("/send-email")
def send_email(request: EmailRequest):
    sender_email = "jozsefkiss90@gmail.com"
    recipient = request.to
    msg = MIMEText(request.message)
    msg["Subject"] = "Message from Knowledge Graph App"
    msg["From"] = sender_email
    msg["To"] = recipient

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login("jozsefkiss90@gmail.com" , "zfla ivrn soii ltfj")
            server.sendmail(sender_email, [recipient], msg.as_string()) 
        return {"status": "sent"}
    except Exception as e:
        return {"status": "error", "details": str(e)}
