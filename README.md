# Obsidian Tools

These are a bunch of random tools I've found useful with Obsidian + Github sync
(the latter is required for these to work).

Right now there are three main things it does:

1. **Email to Obsidian:** Set up an email address that can catch emails and add
   them as notes to your Obsidian.
2. **Daily Summaries:** Writes a Daily Summary note each day of your new notes +
   changes.
3. **Weekly Sumary:** Writes a weekly summary note each week from your Daily
   Summaries.

Runs on [Vercel](https://vercel.com) with the help of a few other services.

## Example Summaries

To give you a sense, here's the structure of the Daily and Weekly Summaries:

### Daily Summaries

Daily Summaries are automatically generated each day and provide a concise
overview of the day's activities, insights, and key information. They typically
include:

1. **Overall Summary**: A brief paragraph summarizing the main events,
   discussions, and developments of the day.

2. **Interesting Ideas**: A bullet-point list of noteworthy concepts or thoughts
   that emerged during the day.

3. **Common Themes**: Recurring topics or patterns observed across various
   activities or discussions.

4. **Questions for Exploration**: Open-ended questions or areas identified for
   further investigation.

5. **Possible Next Steps**: Actionable items or potential follow-up tasks based
   on the day's events.

6. **Notes**: Detailed breakdowns of specific meetings, conversations, or
   activities that occurred during the day.

7. **URLs**: A list of relevant links mentioned or accessed during the day, with
   brief descriptions of their content.

### Weekly Summaries

Weekly Summaries are generated at the end of each week, providing a higher-level
overview of the week's activities and insights. They typically include:

1. **Overall Summary**: A comprehensive paragraph or two summarizing the main
   themes, developments, and achievements of the week.

2. **Strategic Implications**: Key insights or decisions that could have
   long-term impacts on projects or strategies.

3. **Challenges & Opportunities**: A breakdown of obstacles faced and potential
   areas for growth or improvement identified during the week.

4. **Key Developments & Trends**: Significant progress made on projects or
   notable trends observed in the industry or work environment.

5. **Long Term Implications**: Potential long-range effects of the week's events
   or decisions on future projects or strategies.

6. **Goals for Next Week**: Specific objectives or tasks to focus on in the
   coming week, based on the current week's outcomes.

These summaries serve as a quick reference for tracking progress, identifying
patterns, and maintaining focus on important goals and ideas over time.

## Required Services

- Inbound Email: [Postmark](https://postmark.com) (You could also probably use
  something else, as long as it can take an email and make it a webhook.)
- Github: This is how we write to Obsidian, so you have to have Github syncing
  on for your Obsidian. This is reasonably straightforward with
  [obsidian-git](https://github.com/Vinzent03/obsidian-git) installed.
- Hosting: [Vercel](https://vercel.com) is the easiest way to host this thing.
- Redis/Queue: [Upstash](https://upstash.com) will be needed for their Qstash
  queue service and for their Redis serverless. Create a new Redis DB and a
  Qstash queue and put the variables in the env file.

## Optional Services

- Proxy: I like [IPRoyal](https://iproyal.com) for proxy. This helps with
  scraping a lot, but it's optional.

## Setting up your env file

Copy the `env.example` file to `.env` and fill in whatever you need.

1. `SECRET_KEY` is currently used by Postmark for emails.
2. `CRON_SECRET` is used by Vercel for daily summaries.
3. `YOUR_NAME` and `YOUR_BIO` are used in the prompt.

## Setting Up Inbound Email > Obsidian

If you're using Postmark:

1. [Sign up for an account](https://account.postmarkapp.com/sign_up)
2. Create a secret key to use with Postmark, put this in your `.env` file under
   `SECRET_KEY`. If you want something simple, just
   [generate a UUID](https://www.uuidgenerator.net/). It's not world class
   security, but it will get the job done.
3. Create a server
4. Click Default Inbound Stream
5. Under "Set your server's inbound webhook URL" add your url. It should be
   whatever URL you're using in dev or production +
   `/api/email?token=SECRET_KEY` (make sure to add your `SECRET_KEY` from step
   2).
6. Save changes
7. Either grab the server's inbound address from that page, or head to settings
   to set up a custom domain address like `obsidian@obsidian.yourdomain.com`

## Running Obsidian Tools Locally

### Starting the local server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the
result.

This project uses
[`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to
automatically optimize and load Inter, a custom Google Font.

### Setup Cloudflare Tunnel

For local development, you can set up a Cloudflare tunnel that you can call from
airtable. I like
[the instructions here](https://kirillplatonov.com/posts/setting-up-cloudflare-tunnel-for-development/).

You'll need to be a Cloudflare user with a domain pointing there (it's free to
use their DNS servies). **If you want to use another tunnel service, go for it.
This doesn't matter except for testing.**

#### Setup the CLI

```bash
brew install cloudflare/cloudflare/cloudflared
```

Then:

```
cloudflared tunnel login
```

#### Create the Tunnel

```bash
cloudflared tunnel create <Tunnel-NAME>
```

After that, point the subdomain to the tunnel:

```bash
cloudflared tunnel route dns <Tunnel-NAME> <SUBDOMAIN>
```

#### Setup the Tunnel in the App

First, **create a new folder at the root of the app called `.cloudflared`**.

Second, on your computer, find `~/.cloudflared/<Tunnel-UUID>.json` and copy that
file to the `.cloudflared` folder we just created. **After it's copied, make
sure you rename it `credentials.json`.**

Third, create a file in that folder called `config.yml` with the following info:

```yml
tunnel: <Tunnel-UUID>
credentials-file: .cloudflared/credentials.json
noTLSVerify: true
```

Finally, give `bin/tunnel` execute permissions:

```bash
chmod +x bin/tunnel
```

#### Run Your Tunnel

Assuming your app is already running (if it's not, `npm run dev`), then all you
need to do is run:

```bash
bin/tunnel <port>
```

For example, if it's running on 3000 (default) you would run `bin/tunnel 3000`
in a new terminal window and everything should be good to go. Test it out by
going to the domain you entered and you should see the homepage for the app (it
just says "airtable helpers" if you haven't changed anything).

## Learn More About Next.js

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js
  features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out
[the Next.js GitHub repository](https://github.com/vercel/next.js/) - your
feedback and contributions are welcome!

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fheyitsnoah%2Fobsidian-tools)

## License

This project is licensed under the Server Side Public License (SSPL). See the
[LICENSE](LICENSE.txt) file for details.
