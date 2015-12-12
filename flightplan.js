// npm install -g flightplan

// to deploy run:
// fly deploy

// https://www.npmjs.com/package/flightplan
var plan = require('flightplan');

var fs = require('fs');
var path = require('path');

// loads the path to your private key
var privateKeyPath = fs.readFileSync('private/privatekeypath.txt');

var remoteUsername = 'deploy';
var projectName = 'PastaSearch';
var remotePath = path.join('home', remoteUsername, projectName);

// after you "npm install -g flightplan", you can run fly deploy from the command line
plan.target('deploy', {
  host: '',
  port: 22,
  username: remoteUsername,
  privateKey: privateKeyPath
});

// run commands on localhost
plan.local(function(local) {
  local.log('Transferring files to host');
  var filesToCopy = local.exec('git ls-files', {silent: true});
  // rsync files to all the target's remote hosts
  local.transfer(filesToCopy, remotePath);
});

// run commands on the target's remote hosts
plan.remote(function(remote) {
  remote.log('Install dependencies');
  remote.sudo('npm --production install ' + remotePath, {user: 'root'});

  remote.log('Reload application');
  remote.sudo('pm2 restart ', {user: 'root'});
});

//plan.local(function(local) { /* ... */ });
//plan.remote(function(remote) { /* ... */ });
