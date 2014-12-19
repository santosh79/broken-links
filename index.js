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
  console.log('BROKEN_LINKS');
  console.log(BROKEN_LINKS);
  var url = LINKS.pop();
  if(set.isInSet(LINKS_VISITED, url)) {
    console.log('skipping url ' + url);
    doScrape(LINKS, LINKS_VISITED, BROKEN_LINKS);
    return;
  }
  console.log('looking at url ' + url);
  console.log('LINKS is ');
  console.log(LINKS);
  console.log('LINKS_VISITED is ');
  console.log(LINKS_VISITED);
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

function scrapeFrom(url, LINKS_VISITED, cb) {
  var fullUrl = url;
  if (url.substring(0, BASE_URL.length) !== BASE_URL) {
    fullUrl = BASE_URL + url;
  }
  request(fullUrl, function(err, res, body) {
    if(err || res.statusCode !== 200) {
      console.error('ERROR fetching url ' + url + " err " + err + ' status_code ' + res.statusCode);
      cb(true, []);
      return;
    }
    extractLinksFrom(url, LINKS_VISITED, function(links) {
      cb(false, links);
      return;
    });
  });
}

function extractLinksFrom(url, LINKS_VISITED, cb) {
  jsdom.env(
    url,
    ["http://code.jquery.com/jquery.js"],
    function (errors, window) {
      var allAnchorTagsInPage = _.uniq(_.map(window.$("a"), function(link) { return link['href']; }));
      var allImageTags        = _.uniq(_.map(window.$("img"), function(link) { return link['src']; }));
      var allLinkTags         = _.uniq(_.map(window.$("link"), function(link) { return link['href']; }));
      var allScriptTags       = _.uniq(_.map(window.$("script"), function(link) { return link['src']; }));
      var linksAndScriptTags = allLinkTags.concat(allScriptTags);
      var allResourceLinks    = allAnchorTagsInPage.concat(allImageTags).concat(linksAndScriptTags);
      var linksThatAreSelfHosted = _.chain(allResourceLinks).filter(function(link) {
        return link.substring(0, BASE_URL.length) === BASE_URL || link[0]  === '/';
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
