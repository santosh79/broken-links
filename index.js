#! /usr/bin/env node
var jsdom        = require("jsdom");
var request      = require("request");
var _            = require("underscore");
var BASE_URL     = "";

if (process.argv.length !== 3) {
  console.log('Usage: broken-link <URL>');
  process.exit(0);
} else {
  BASE_URL = process.argv[2];
}

(function startScraping() {
  console.log('starting scraping of ' + BASE_URL);
  var links = [BASE_URL];
  doScrape(links, [], []);
}());

function doScrape(LINKS, LINKS_VISITED, BROKEN_LINKS) {
  var urlsToScrape = _.difference(LINKS, LINKS_VISITED);

  if (urlsToScrape.length === 0) {
    printResults(LINKS_VISITED, BROKEN_LINKS);
    return;
  }
  var pending      = urlsToScrape.length;
  var brokenLinks  = BROKEN_LINKS;
  var linksVisited = LINKS_VISITED;
  _.each(urlsToScrape, function(url) {
    scrapeFrom(url, LINKS_VISITED, function(isBroken, links) {
      linksVisited = linksVisited.concat([url]);
      if(isBroken) {
        brokenLinks = brokenLinks.concat([url]);
      }
      LINKS = _.union(LINKS, links);
      if(--pending === 0) {
        doScrape(LINKS, linksVisited, brokenLinks);
      }
      return;
    });
  });
}

function printResults(LINKS_VISITED, BROKEN_LINKS) {
  console.log('scraping complete. \n links_visited are: ');
  console.log(LINKS_VISITED);
  console.log('broken links are');
  console.log(BROKEN_LINKS);
  process.exit(0);
}

function isRelativeUrl(url) {
  return url.substring(0, BASE_URL.length) !== BASE_URL;
}

function scrapeFrom(selfHostedUrl, LINKS_VISITED, cb) {
  var fullUrl = selfHostedUrl;
  if (isRelativeUrl(selfHostedUrl)) {
    fullUrl = BASE_URL + selfHostedUrl;
  }
  request(fullUrl, function(err, res, body) {
    if(err || res.statusCode !== 200) {
      cb(true, []);
      return;
    }
    extractLinksFrom(body, LINKS_VISITED, function(links) {
      cb(false, links);
      return;
    });
  });
}

function extractLinksFrom(body, LINKS_VISITED, cb) {
  jsdom.env(
    body,
    ["http://code.jquery.com/jquery.js"],
    function (errors, window) {
      var allResourceLinks       = getAllResourcesInPage(window);
      var linksThatAreSelfHosted = _.chain(allResourceLinks).map(function(link) {
        return link.replace(/^file:\/\//, "");
      }).filter(function(link) {
        return link[0]  === '/';
      }).reject(function(link) {
        return link.substring(0, 2) === '//';
      }).reject(function(link) {
        //HACK -- Figure out how to clean this
        return link.indexOf('broken-links/index.js') >= 0;
      }).value();
      cb(linksThatAreSelfHosted);
      return;
    }
  );
}

function getAllResourcesInPage(window) {
  var allAnchorTagsInPage = _.uniq(_.map(window.$("a"), function(link) { return link['href']; }));
  var allLinkTags         = _.uniq(_.map(window.$("link"), function(link) { return link['href']; }));
  var allScriptTags       = _.uniq(_.map(window.$("script"), function(link) { return link['src']; }));
  var linksAndScriptTags  = allLinkTags.concat(allScriptTags);
  var allResourceLinks    = allAnchorTagsInPage.concat(linksAndScriptTags);
  return allResourceLinks;
}
