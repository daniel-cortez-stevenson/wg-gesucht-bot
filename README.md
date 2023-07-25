# WG-Gesucht Bot

What it does:

- Retrieves new ad listings based on a filter or search (URL) every 2 minutes.
- Sends a message template to the newly-found ad owners.
- Ad language detection and configurable message templates per language (ENG/DEU only).

## Quickstart

### Configure the app

```bash
cp .env.example .env
vi .env
```

### Build & run the app with Docker

```bash
docker build -t wg-gesucht-bot .
docker run -i --init --cap-add=SYS_ADMIN \
    --restart always \
    -v "$(pwd)/db:/home/pptruser/db" \
    wg-gesucht-bot
```

### Install and run the app locally

```bash
npm i
npm start
```

## Configuration

A guide to the app's .env file

### WG Gesucht Login

In order to use the script you will need to apply your credentials and template messages in the generated .env file:

```dotenv
WG_USER=YOUR-EMAIL
WG_PASSWORD=YOUR-PASSWORD
```

### Message Template per Language

The script detects the language of the ad (German or English) so you will have to provide the message template id of your German and English versions of your initial message to ad owners.

1. Log in into your wg-account and go into your [Message templates](https://www.wg-gesucht.de/en/mein-wg-gesucht-message-templates.html). Create one message template for English ads and one message template for German ads. *Note: If you wish to use only one language you can use the same id for both languages.*

2. Click on each message template and record the value of the URL parameter `template_id` for the respective language in the .env file.

    - The URL will like: `https://www.wg-gesucht.de/en/message-template.html?template_id=YOUR-MESSAGE-ID`

```dotenv
MESSAGE_ENG=YOUR-MESSAGE-ID
MESSAGE_GER=YOUR-MESSAGE-ID
```

### Search Filter

1. (Optional) Create a saved filter using the browser.

2. Navigate to the desired filter or search results page. Find the saved filter URL (by clicking on a saved filter from your home page), OR use a search URL (after a searching manually).

3. Copy the URL from the browser and set it as the value of `FILTER_URL` in the .env file (regardless of if it is a fiter URL or a search URL).

    - Both filter URLs and search URLs will have a format similar to: `https://www.wg-gesucht.de/en/wg-zimmer-in-Berlin.8.0.1.0.html?offer_filter=1&noDeact=1&city_id=8&category=0&rent_type=0&rMax=450`

```dotenv
FILTER_URL=YOUR_FILTER_OR_SEARCH_URL
```

## Helpful Commands

Track the total number of messages sent for a given Docker container instance.

```bash
# $(docker ps -q) here only works when only one container is running per Docker Daemon.
docker logs $(docker ps -q) |grep 'Message sent!'| wc -l |xargs echo "Messages Sent:"
```
