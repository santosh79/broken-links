var jsdom        = require("jsdom");
var fs           = require('fs');
var path         = require('path');
var request      = require("request");
var _            = require("underscore");
var set          = require('./set');
var BASE_URL     = process.env['BASE_URL'];

(function startScraping() {
  doScrape([BASE_URL], set.create(), set.create());
}());

function doScrape(LINKS, LINKS_VISITED, BROKEN_LINKS) {
  if (LINKS.length === 0) {
    printResults(LINKS_VISITED, BROKEN_LINKS);
    return;
  }
  var url = LINKS.pop();
  if(set.isInSet(LINKS_VISITED, url)) {
    doScrape(LINKS, LINKS_VISITED, BROKEN_LINKS);
    return;
  }
  scrapeFrom(url, LINKS_VISITED, function(isBroken, links) {
    if(isBroken) {
      doScrape(LINKS.concat(links), set.addToSet(LINKS_VISITED, url), set.addToSet(BROKEN_LINKS, url));
    } else {
      doScrape(LINKS.concat(links), set.addToSet(LINKS_VISITED, url), BROKEN_LINKS);
    }
    return;
  });
}

function printResults(LINKS_VISITED, BROKEN_LINKS) {
  console.log('scraping done');
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
      console.error('ERROR fetching url ' + selfHostedUrl + " err " + err + ' status_code ' + res.statusCode);
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
      }).value();

      var linksNotVisited = _.filter(linksThatAreSelfHosted, function(link) {
        return set.isNotInSet(LINKS_VISITED, link);
      });
      cb(linksNotVisited);
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
