var apiUrl = 'https://api.digitalocean.com/v2';
var apiKeys = apiUrl + '/account/keys';
var apiDroplets = apiUrl + '/droplets';
var token = null;
var sshKey = null;

function getQueryStringParam(name) {
    var queryParams = window.location.hash.substring(1).split('&');
    for (var i = 0; i < queryParams.length; i++) {
        var param = queryParams[i].split('=');
        if (param[0] === name) {
            return param[1];
        }
    }
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function getSSHKeys(token, callback) {
    $.ajax({
        type: "GET",
        url: apiKeys,
        headers: {
          "Content-Type": 'application/json',
          "Authorization": 'Bearer ' + token
        },
        success: function (res) {
            callback(null, res);
        },
        error: function (err) {
            callback(err);
        }
    });
}

function addSSHKey(token, name, key, callback) {
    $.ajax({
        type: "POST",
        url: apiKeys,
        headers: {
            "Content-Type": 'application/json',
            "Authorization": 'Bearer ' + token
        },
        data: JSON.stringify({
            "name": name,
            "public_key": key
        }),
        success: function (res) {
            callback(null, res);
        },
        error: function (err) {
            callback(err);
        }
    });
}

function selectSSHKey(key) {
    sshKey = key;
    return false;
}

function createDroplet() {

    var org = document.getElementById('org').value.toLowerCase();
    var domain = document.getElementById('domain').value.toLowerCase();
    var name = document.getElementById('name').value.toLowerCase();
    var password = document.getElementById('password').value;

    $.ajax({
        type: "POST",
        url: apiDroplets,
        headers: {
            "Content-Type": 'application/json',
            "Authorization": 'Bearer ' + token
        },
        data: JSON.stringify({
            name: "Otalk",
            region: "nyc3",
            size: "1gb",
            image: "ubuntu-14-04-x64",
            ssh_keys: sshKey ? [ sshKey ] : null,
            backups: false,
            ipv6: false,
            private_networking: null,
            user_data: `
#cloud-config
packages:
- git
- docker.io
- ldap-utils
runcmd:
- docker pull orchardup/postgresql
- docker pull nickstenning/slapd
- docker run -d --name postgres -p 5432:5432 -e POSTGRESQL_USER=dbuser -e POSTGRESQL_PASS=` + password + ` orchardup/postgresql
- docker run -d --name ldap -p 389:389 -e LDAP_DOMAIN=` + org + ` -e LDAP_ORGANISATION=` + org.capitalize() + ` -e LDAP_ROOTPASS=` + password + ` nickstenning/slapd
- git clone git://github.com/digicoop/otalk-prosody.git /opt/apps/prosody
- sed 's/admin@example.com/admin@` + domain + `/' -i /opt/apps/prosody/users.ldif
- sed 's/user1@example.com/` + name + `@` + domain + `/' -i /opt/apps/prosody/users.ldif
- sed 's/adminpass/` + password + `/' -i /opt/apps/prosody/users.ldif
- sed 's/user1pass/` + password + `/' -i /opt/apps/prosody/users.ldif
- sed 's/example.com/` + org + `/' -i /opt/apps/prosody/users.ldif
- sed 's/ExampleDesc/` + org.capitalize() + `/' -i /opt/apps/prosody/users.ldif
- sed 's/user1/` + name + `/' -i /opt/apps/prosody/users.ldif
- docker build -t prosody /opt/apps/prosody/Docker
- docker run -d -p 5222:5222 -p 5269:5269 -p 5280:5280 -p 5281:5281 -p 3478:3478/udp --name prosody --link postgres:postgres --link ldap:ldap -e XMPP_DOMAIN=` + domain + ` -e DB_NAME=docker -e DB_USER=dbuser -e DB_PWD=` + password + ` -e LDAP_BASE=dc=` + org + ` -e LDAP_DN=cn=admin,dc=` + org + ` -e LDAP_PWD=` + password + ` -e LDAP_GROUP=` + org + ` prosody
- ldapadd -h localhost -x -D cn=admin,dc=` + org + ` -w ` + password + ` -f /opt/apps/prosody/users.ldif
`
        }),
        success: function (res) {
            console.log("Droplet created");
            document.getElementById('xmppInfos').innerHTML = "<h1>Droplet " + res.droplet.name + " created !</h1>";
        },
        error: function (err) {
            if (err) console.log(err);
        }
    });

    return false;
}

$(function() {

  token = getQueryStringParam('token');
  window.history.pushState(null, "", window.location.origin + window.location.pathname);

  getSSHKeys(token, function(err, res) {
      if (err) {
          console.log(err);
          return;
      }
      var list = document.getElementById("keys");
      res.ssh_keys.forEach(function (key) {
          var newItem = document.createElement("li");
          var textnode = document.createTextNode(key.name);
          newItem.appendChild(textnode);
          newItem.onclick = function() { selectSSHKey(key.fingerprint); this.style.backgroundColor = "#FF0000"; };
          list.appendChild(newItem);
      });
      console.log(res);
  });


});
