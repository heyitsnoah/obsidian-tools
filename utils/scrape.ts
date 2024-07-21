import axios from 'axios'
import { load } from 'cheerio'
import { SocksProxyAgent } from 'socks-proxy-agent'

// Todo:
// - If YouTube grab transcript
export async function scrapeUrl(url: string) {
  let data
  if (process.env.PROXY_HOST) {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }

    const proxyAgent = new SocksProxyAgent(
      `socks5://${process.env.PROXY_USERNAME!}:${process.env
        .PROXY_PASSWORD!}@${process.env.PROXY_HOST!}:${process.env.PROXY_PORT!}`
    )
    try {
      const axiosResponse = await axios.get(url, {
        headers,
        httpsAgent: proxyAgent, // Set the agent here
      })

      data = axiosResponse.data
    } catch (error) {
      console.log(error)
      return null
    }
  } else {
    const fetchResponse = await fetch(url)
    if (!fetchResponse.ok) {
      return null
    }
    data = await fetchResponse.text()
  }
  if (!data) {
    return null
  }

  // Extract the data
  const $ = load(data)
  const text = $('body')
    .clone() // clone the body to not alter the original element
    .find('script, style, iframe, img, noscript') // find all unwanted elements
    .remove() // remove them from the clone
    .end() // end the filtering
    .text() // get the text of the cleaned clone
    .replace(/\s+/g, ' ') // replace multiple spaces with a single space
    .trim() // trim whitespace from the ends
  const title = $('title').first().text().trim() || null

  const metadata = $('meta')
    .toArray()
    .map((tag) => {
      const property = $(tag).attr('property') || $(tag).attr('name')
      const content = $(tag).attr('content')
      return { property, content }
    })
  return { title, body: text, metadata }
}
