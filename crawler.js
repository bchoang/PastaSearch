var pg = require('pg');
var request = require('request');

var conString = require('fs').readFileSync(require('path').join(__dirname, 'private/pgstring.txt'))';

// this initializes a connection pool
// it will keep idle connections open for a (configurable) 30 seconds
// and set a limit of 20 (also configurable)
function addPost(id, selftext, score){
    pg.connect(conString, function(err, client, done) {
        if(err) return console.error('error fetching client from pool', err);

        client.query('SELECT id from posts WHERE id=$1', [id], function(err, checkResult) {
            done(); //call `done()` to release the client back to the pool
            if(err) return console.error('error running query', err);
            if (checkResult.rows.length !== 0) return console.log('that post has been entered already');

            client.query('INSERT INTO posts (id, selftext, score) VALUES ($1, $2, $3::int);', [id, selftext, score], function(err, result) {
                done(); //call `done()` to release the client back to the pool
                if(err) return console.error('error running query', err);
            });

        });
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
                var score = post.data.score;
                var id = post.data.id;

                addPost(id, selftext, score);
            }
        }
    });
}

var baseURL = "https://www.reddit.com/r/copypasta/top.json?sort=top&t=all";
fetchData(baseURL, "", 15);
