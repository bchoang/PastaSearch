var express = require('express');
var router = express.Router();
var request = require('request');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.sendFile('index.html');
});

var pg = require('pg');

var conString = require('fs').readFileSync(require('path').join(__dirname, '../private/pgstring.txt')).toString();

router.get('/get', function (req, res, next){
    var searchText = req.query.searchText;
    var page = req.query.page;

    var pattern = "%(" + searchText.split(' ').join('|') + ")%";

    var queryText = "SELECT selftext FROM posts WHERE selftext SIMILAR TO $1 ORDER BY score DESC LIMIT 10";
    if (page) queryText += "OFFSET " + page*10;

    var firstWord = "select index.id, index.occurances, index.word, posts.selftext, posts.score, posts.id from index, posts where word = '"+ searchText.split(' ')[0] +"' and index.id = posts.id order by occurances DESC LIMIT 10";
    if (page) firstWord += " OFFSET " + page*10 + ";";
//    var firstWord = "select id, occurances, word from index where word = '"+ searchText.split(' ')[0]  +"' order by occurances desc;"
    console.log(firstWord);
    pg.connect(conString, function(err, client, done) {
        if(err) return console.error('error fetching client from pool', err);
    
        client.query(firstWord, function(err, result) {
            if(err) return console.log('\t' +  err);

            if (result.rows[0])
            res.send(result.rows);
            done(); //call `done()` to release the client back to the pool

        });
    });
});

module.exports = router;
