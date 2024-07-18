# Obsidian Tools

These are a bunch of random tools I've found useful with Obsidian + Github sync
(the latter is required for these to work).

## Required Services

- Inbound Email: [Postmark](https://postmark.com) (You could also probably use
  something else, as long as it can take an email and make it a webhook.)
- Github: This is how we write to Obsidian, so you have to have Github syncing
  on for your Obsidian. This is reasonably straightforward with
  [obsidian-git](https://github.com/Vinzent03/obsidian-git) installed.
- Hosting: [Vercel](https://vercel.com) is the easiest way to host this thing.

## Setting Up Inbound Email > Obsidian

If you're using Postmark:

1. Sign up for an account
2. Create a server
3. Click Default Inbound Stream
4. Under "Set your server's inbound webhook URL" add your url. It should be
   whatever URL you're using in dev or production + `/api/email`
5. Save changes
6. Either grab the server's inbound address from that page, or head to settings
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

## Cool

Yes
