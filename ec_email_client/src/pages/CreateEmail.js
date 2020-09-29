import React, { useEffect, useState } from "react";
import { renderToString } from "react-dom/server";
import Alert from "react-bootstrap/Alert";
import "./CreateEmail.css";

class EmailComposition extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            recipient: "",
            subject: "",
            message: "",
            cc: "",
            date: new Date(),
        };

        // Formats fields if it is a reply
        if (this.props.reply) {
            let recipientField = this.props.replyMessage.from.split("<")[1];
            recipientField = recipientField.substring(
                0,
                recipientField.length - 1
            );

            this.state = {
                recipient: recipientField,
                subject: "Re: " + this.props.replyMessage.subject,
                message: "",
                cc: "",
                date: new Date(),
            };

            // Puts cursor at top of message box instead of bottom beneath the reply message.
            setTimeout(() => {
                let textBox = document.getElementsByTagName("textarea")[0];
                textBox.focus();
                textBox.selectionEnd = 0;
            }, 500);
        }
    }

    // All funcitons to handle changes
    onRecipientChange(event) {
        this.setState({ recipient: event.target.value });
    }

    onSubjectChange(event) {
        this.setState({ subject: event.target.value });
    }

    onCCChange(event) {
        this.setState({ cc: event.target.value });
    }

    onMessageChange(event) {
        this.setState({ message: event.target.value });
    }

    //JS Fetch API to send the form data
    handleSubmit(event) {
        //this.initClient();
        event.preventDefault();
        //Must encode subject line
        const utf8Subject = `=?utf-8?B?${Buffer.from(
            this.state.subject
        ).toString("base64")}?=`;

        let threadId = null;
        //PICK UP here

        //Split the multiple recipients's (if there are multiple) and change commas to tags
        //This solution works if a gmail address goes first???
        var toSend = this.state.recipient.replace(",", ", ");

        // TODO: Possible make content editable div to render HTML? Or maybe just display reply email below the text are as a div
        // https://stackoverflow.com/questions/4705848/rendering-html-inside-textarea

        // Could just make all newLines be <br /> or something?

        var messageParts = [
            `To: ${toSend}`,
            "Content-Type: text/html; charset=utf-8",
            "MIME-Version: 1.0",
            `Subject: ${utf8Subject}`,
            "",
            this.state.message,
        ];

        // If reply
        if (this.props.reply) {
            let tempSubject = `=?utf-8?B?${Buffer.from(
                `${utf8Subject}`
            ).toString("base64")}?=`;

            console.log(this.props.replyMessage);
            let inReplyTo = this.props.replyMessage.headers["Message-Id"];

            let references = inReplyTo;
            if (this.props.replyMessage.headers["References"]) {
                references = `${inReplyTo},${this.props.replyMessage.headers["References"]}`;
            }

            threadId = this.props.replyMessage.threadId;

            messageParts = [
                `To: ${toSend}`,
                "Content-Type: text/html; charset=utf-8",
                "MIME-Version: 1.0",
                `Subject: ${tempSubject}`,
                `In-Reply-To: ${inReplyTo}`,
                `Reply-To: ${this.props.replyMessage.to}`,
                `References: ${references}`,
                "",
                this.state.message +
                    "<br/><br/><hr/>" +
                    renderToString(this.displayReplyEmail()),
            ];
        }

        //If there is a cc, need a different format
        //Works if the first address is a gmail. Makes 0 sense to me.
        if (this.state.cc != "") {
            //Split the multiple cc's(if there are multiple) and change commas to tags
            var CCs = this.state.cc.replace(",", ", ");

            messageParts = [
                `To: ${toSend}`,
                `CC: ${CCs}`,
                "Content-Type: text/html; charset=utf-8",
                "MIME-Version: 1.0",
                `Subject: ${utf8Subject}`,
                "",
                this.state.message,
            ];
        }

        console.log(messageParts);

        const message = messageParts.join("\n");

        // The body needs to be base64url encoded.
        const encodedMessage = Buffer.from(message)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        window.gapi.client.gmail.users.messages
            .send({
                userId: "me",
                resource: {
                    raw: encodedMessage,
                    threadId: threadId,
                },
            })
            .then((result) => {
                console.log(result);
                console.log(result.status);
                if (result.status == 200) {
                    //Alert that the email sending was a success
                    alert("Message Sent Successfully");
                } else {
                    alert("Message Failed to Sent");
                }
            });

        this.clearForm();
    }

    clearForm() {
        this.setState({ recipient: "", subject: "", message: "", cc: "" });
        this.props.toggle();
        //Need to add function that takes user back to Inbox Page here
    }

    displayReplyEmail() {
        return (
            <div>
                <b>From: </b>
                {this.props.replyMessage.from}
                <br />
                <b>To: </b>
                {this.props.replyMessage.to}
                <br />
                <b>Subject: </b>
                {this.props.replyMessage.subject}
                <br />
                <hr />
                <br />
                {this.props.replyMessage.bodyHTML != "null" && (
                    <div
                        id="replyEmailDiv"
                        dangerouslySetInnerHTML={{
                            __html: this.props.replyMessage.bodyHTML,
                        }}
                    />
                )}
                {this.props.replyMessage.bodyHTML == "null" &&
                    this.props.replyMessage.bodyText}
                <br />
            </div>
        );
    }

    render() {
        return (
            <div className="EmailCreation">
                <h2 className="EmailHeader">Send Email</h2>

                <form id="email-form" onSubmit={this.handleSubmit.bind(this)}>
                    <div className="form-group">
                        <label>Send To: </label>
                        <br />
                        <input
                            type="email"
                            multiple
                            className="form-control"
                            value={this.state.recipient}
                            onChange={this.onRecipientChange.bind(this)}
                        />
                    </div>
                    <div className="form-group">
                        <label>CC: </label>
                        <br />
                        <input
                            type="email"
                            multiple
                            className="form-control"
                            value={this.state.cc}
                            onChange={this.onCCChange.bind(this)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Subject: </label>
                        <br />
                        <input
                            type="text"
                            className="form-control"
                            value={this.state.subject}
                            onChange={this.onSubjectChange.bind(this)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Add Attachment: </label>
                        <input
                            type="file"
                            className="form-control"
                            value={this.state.file}
                        />
                    </div>
                    <div className="form-group">
                        <label>Message: </label>
                        <br />
                        <textarea
                            className="form-control"
                            rows="15"
                            value={this.state.message}
                            onChange={this.onMessageChange.bind(this)}
                        />
                    </div>
                    {this.props.reply && this.displayReplyEmail()}
                    <button type="submit" className="submit-button">
                        Send Email
                    </button>
                </form>
                <button
                    type="cancel"
                    className="cancel-button"
                    onClick={this.clearForm.bind(this)}
                >
                    Cancel
                </button>
            </div>
        );
    }
}

export default EmailComposition;
