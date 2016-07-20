var DocumentDBClient = require('documentdb').DocumentClient;
var moment = require('moment');

function User(dataDao, userId) {
  this.dataDao = dataDao;
  this.userId = userId
}

module.exports = User;


User.prototype = {
  addHistory: function (historyItem, callback ) {
    var self = this;

    self.dataDao.getItem( self.userId, function( err, doc) {
      var newDoc = false;
      if ( err ) {
        console.log( "Error getting user - ", err );
        return callback( err );
      } else if ( !doc ) {
        // Couldn't find user document - create it
        console.log( "Creating new user doc" );

        newDoc = true;
        doc = { userId: self.userId, history: [historyItem] };
        newDoc = true;
      } else {
        console.log( "Updating history" );
        doc.history.unshift( historyItem );
      }

      // Update or create doc
      if ( newDoc ) {
        self.dataDao.addItem(  doc, function( err, doc) {

          var msg = null;
          if ( err ) {
            console.log( "Error adding new user with id ", self.userId, " - ", err );
          } else {
            msg = "Done";
          }

          callback(err, msg);
        });
      } else {
        self.dataDao.updateItem( doc, function( err, replaced ) {
          var msg = null;
          if ( err ) {
            console.log( "Error updating user doc - ", err );
          } else {
            msg = "Done";
          }

          callback(err, msg);
        });
      }
    });
  },
  getHistory: function (callback ) {
    var self = this;

    self.dataDao.getItem( self.userId, function( err, doc) {
      if ( err ) {
        console.log( "Error getting user - ", err );
        return callback( err );
      } else if ( !doc ) {
        // Couldn't find user document
        console.log( "Creating new user doc" );
        return callback( "Couldn't find user" );
      } else {
        return callback( null, doc.history );
      }
    });
  },
  setToken: function (token, callback ) {
    var self = this;

    var tokenExpiry = moment().add(2, 'minutes').unix();

    self.dataDao.getItem( self.userId, function( err, doc) {
      if ( err ) {
        callback( err );
      }

      doc.token = token;
      doc.tokenValidTo = tokenExpiry;
      self.dataDao.updateItem( doc, function( err, replaced ) {
        callback(err, replaced);
      });      
    });
  },
  joinWithToken: function (token, callback ) {
    var self = this;

    var now = moment().unix();

    var querySpec = {
        query: 'SELECT * FROM users u WHERE u.token=@token and u.tokenValidTo > @now',
        parameters: [{
            name: '@token',
            value: token
        },{
          name: '@now',
          value : now
        }
        ]
    };

    // See if we can find a user that has this token
    self.dataDao.find( querySpec, function( err, results ) {

      if (err) {
        console.log( 'Unable to find a token with id ', token );
        return callback( err );
      }
      else if ( results.length != 1 ) {
        console.log( 'Unable to find a token with id ', token );
        return callback( 'Unable to find a token' );
      }
      // We have, remove the token value as it has been used
      var doc = results[0];
      doc.token = null;
      self.dataDao.updateItem( doc, function( err, replaced ) {
        callback(err, replaced);
      });
    })
  }

} 

