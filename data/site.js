// SITE SETTINGS.
// Newsletter: create a free account with an email service (Buttondown, MailerLite, Brevo, Mailchimp...), copy the
// address its signup form posts to into "action", and the name of its email field into "field" (usually "email").
// Until "action" is filled in, the signup block is shown to you only (owner mode) and visitors do not see it.
window.KTT=window.KTT||{};
KTT.newsletter={
 name:"The best Kill Team newsletter",
 pitch:"Tactics, puzzles, battle reports and news. One email, no spam.",
 action:"",            // e.g. "https://buttondown.com/api/emails/embed-subscribe/your-name"
 mailto:"ugobocchi1@gmail.com", // used while "action" is empty: the visitor's mail app opens a ready-to-send signup message. Empty it to hide the block again.
 field:"email",
 hidden:{}             // extra fields some services want, e.g. {"tag":"website"}
};

// Home page: "#killteam on X" block. The buttons always work. To also show posts on the page, fill ONE of:
//   profile:"SomeAccount"            embeds that account's timeline
//   list:"owner/list-slug"           embeds an X list (e.g. a list of Kill Team strategy accounts you curate)
//   html:'<script ...></script>'     embed code from a feed service that supports hashtags (Elfsight, Juicer, Taggbox...)
KTT.x={show:false,   // set to true to show the block on the home page
 hashtag:"killteam",profile:"",list:"",html:""};
