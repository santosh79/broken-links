###What?
This is a dead simple "scraper" that looks *recursively* through all self-hosted URLs given a base url. Incredibly, useful when you have a blog server running locally and want to make sure all links are working as expected before you publish.

### Install
    npm install find-broken-links -g

###Usage
    find-broken-links <url>

Example

    find-broken-links http://www.google.com


###LICENSE
    MIT
