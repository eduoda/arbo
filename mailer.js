const nodemailer = require("nodemailer");

class Mailer{

  constructor(){
  }

  setOptions(options){
    this.options = options;
    if(this.options.test){
      nodemailer.createTestAccount((err, account) => {
        console.log("Ethereal Email account:");
        console.log(account);
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
              user: account.user,
              pass: account.pass
          }
        });
      });
      return;
    }
    this.transporter = nodemailer.createTransport(options);
  }

  async send(mail){
    const info = await this.transporter.sendMail(mail);
    if(this.options.test){
      console.log("Message sent: %s", info.messageId);
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    return info;
  }

}

module.exports = {Mailer};
