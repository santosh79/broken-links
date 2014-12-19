var jsdom         = require("jsdom");
var fs            = require('fs');
var path          = require('path');
var request       = require("request");
var _             = require("underscore");
var SITE_DIR      = "./site";
var BASE_URL      = process.env['BASE_URL'];
var LINKS_VISITED = {};
var BROKEN_LINKS = [];

(function startScraping() {
  var doScrape = function(LINKS) {
    if (LINKS.length === 0) {
      printResults();
      return;
    }
    var url = LINKS.pop();
    if(LINKS_VISITED[url]) {
      console.log('skipping url ' + url);
      doScrape(LINKS);
      return;
    }
    console.log('looking at url ' + url);
    console.log('LINKS is ');
    console.log(LINKS);
    console.log('LINKS_VISITED is ');
    console.log(LINKS_VISITED);
    scrapeFrom(url, function(links) {
      LINKS_VISITED[url] = true;
      doScrape(LINKS.concat(links));
      return;
    });
  };
  doScrape([BASE_URL]);
}());

function printResults() {
  console.log('scraping done');
  console.log(_.keys(LINKS_VISITED));
  console.log('broken links are');
  console.log(_.uniq(BROKEN_LINKS));
  process.exit(0);
}

function scrapeFrom(url, cb) {
  var fullUrl = url;
  if (url.substring(0, BASE_URL.length) !== BASE_URL) {
    fullUrl = BASE_URL + url;
  }
  request(fullUrl, function(err, res, body) {
    LINKS_VISITED[url] = true;
    if(err || res.statusCode !== 200) {
      console.error('ERROR fetching url ' + url + " err " + err + ' status_code ' + res.statusCode);
      BROKEN_LINKS.push(url);
      cb([]);
    }
    extractLinksFrom(url, function(links) {
      cb(links);
    });
  });
}

function extractLinksFrom(url, cb) {
  jsdom.env(
    url,
    ["http://code.jquery.com/jquery.js"],
    function (errors, window) {
      var allAnchorTagsInPage = _.uniq(_.map(window.$("a"), function(link) { return link['href']; }));
      var allImageTags        = _.uniq(_.map(window.$("img"), function(img) { return link['src']; }));
      var allLinkTags         = _.uniq(_.map(window.$("link"), function(link) { return link['href']; }));
      var allScriptTags       = _.uniq(_.map(window.$("script"), function(link) { return link['src']; }));
      var linksAndScriptTags = allLinkTags.concat(allScriptTags);
      var allResourceLinks    = allAnchorTagsInPage.concat(allImageTags).concat(linksAndScriptTags);
      var linksThatAreSelfHosted = _.filter(allResourceLinks, function(link) {
        return link.substring(0, BASE_URL.length) === BASE_URL || link[0]  === '/';
      });

      var linksNotVisited = _.filter(linksThatAreSelfHosted, function(link) {
        return !LINKS_VISITED[link];
      });
      cb(linksNotVisited);
    }
  );
}
