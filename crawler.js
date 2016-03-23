var pg = require('pg');
var request = require('request');
var async = require('async');
var punycode = require('punycode');

var conString = require('fs').readFileSync(require('path').join(__dirname, 'private/pgstring.txt')).toString();

console.log(conString);
// this initializes a connection pool
// it will keep idle connections open for a (configurable) 30 seconds
// and set a limit of 20 (also configurable)
function addPost (id, selftext, score, subreddit){
async.waterfall([
    function createPostsClient(callback){
        pg.connect(conString, function(err, client, done) {
            if (err) return console.error('error fetching client from pool');
            
            client.query('SELECT id from posts WHERE id=$1', [id], function(err, result) {
                if (err) callback ('error with the query' + err);
                else if (result.rows.length !== 0) {
                    //console.log ('This post has already been discovered');
                    done();
                } else callback(null, client, done);
            });

        });
    }, 
    function addToPosts(client, done, callback){
        client.query('INSERT INTO posts (id, selftext, score, category) VALUES ($1, $2, $3::int, $4);', [id, selftext, score, subreddit], function(err, result) {
            done(); //call `done()` to release the client back to the pool
            callback (err);
        });
    },
    function addToIndex(callback){
        console.log('discovered new post ' + id);

        var freq = {};

        var emojiMatch = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;
            
        var currentWord = '';
        var doneWithWord = false;
        for (var i = 0, l = selftext.length; i < l; i ++){
            // check if next character is an emoji
            var potentialEmoji = selftext[i] + selftext[i+1]; 
            if (emojiMatch.test(potentialEmoji)){
                if (freq[potentialEmoji]) freq[potentialEmoji] ++;
                else freq[potentialEmoji] = 1;
                doneWithWord = true;
                i++;
            } else if (selftext[i] == ' ') {
                doneWithWord = true;
            } else {
                currentWord += selftext[i];
                doneWithWord = false;
            }

            var punctuationReg = new RegExp("[\.\!\,\?\:\\\"\\\']+$");
            var quoteReg = new RegExp("^[\"\']");
            if (doneWithWord && currentWord !== ''){
                currentWord = currentWord.replace(punctuationReg, '');
                currentWord = currentWord.replace(quoteReg, '');
                if(freq[currentWord]) freq[currentWord] ++;
                else freq[currentWord] = 1;
                currentWord = '';
            }
        }

        for (var current in freq){
            if (freq.hasOwnProperty(current)){
                (function (cur, id, occ) {
                    pg.connect(conString, function (err, client, done){
                        if (err) return console.error('error fetching client from pool' , err);
                        client.query('insert into index (word, id, occurances) values ($1, $2, $3::int);', [cur, id, occ], function (err, result) {
                            callback (err, result);
                            done();
                        });
                    });
                })(current, id, freq[current]);
            }
        }

    }
], function(err, result){
    //console.log(err);
    //console.log(result);
});
}

function fetchData (url, next, timesLeft){
    if (timesLeft < 0) return;
    var currentPage = url + "&count=25&after=" + next;
    console.log(currentPage);
    request(currentPage, function (err, response, body){
        if (!err && response.statusCode == 200) {
            var data = JSON.parse(body).data;
            fetchData (url, data.after, timesLeft-1);

            var posts = data.children;
            for (var i = 0, l = posts.length; i < l; i ++){
                var post = posts[i];
                var selftext = post.data.selftext;
                var subreddit = post.data.subreddit;
                var score = post.data.score;
                var id = post.data.id;

                addPost(id, selftext, score, subreddit);
            }
        }
    });
}

var baseURL = "https://www.reddit.com/r/copypasta+emojipasta+goodshitpasta+dickcember/top.json?sort=top&t=all";
fetchData(baseURL, "", 15);
