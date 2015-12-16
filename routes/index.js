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

    pg.connect(conString, function(err, client, done) {
        if(err) return console.error('error fetching client from pool', err);
    
        client.query(queryText, [pattern], function(err, result) {
            done(); //call `done()` to release the client back to the pool
            if(err) return console.error('error running query', err);

            if (result.rows[0])
            res.send(result.rows);
        });
    });
});

module.exports = router;
