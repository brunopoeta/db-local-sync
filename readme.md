![DB-Local-Sync](assets/img/logo.png)
# DB-Local-Sync
## What is it?
DB-Local-Sync is a very small nodejs package that keeps your local database in sync with a remote database, for development purposes.

## Limitations
Right now, DB-Local-Sync only works with MySQL databases. But I'm already working on MongoDB support.

## How does it work?
You simply set the configuration file with the local and remote databases and a time interval. It will check every N minutes if there are changes and you will get a notification to update it. That's it. 

## Install
Install it globally so you can run on your projects:
```
$ npm install -g db-local-sync
```

## How to use it?
On your working directory, create a **dbconfig.json** file, like this:
```js
{
  "interval": 5, // time interval to check for new changes (in minutes)
  
  "local": { // local database settings
    "host": "localhost",
    "user": "root",
    "password": "password",
    "database": "local_db",
    "port": 3306 // default is 3306
  },
  
  "remote": { // remote database settings
    "host": "mysql://remotedatabase",
    "user": "root",
    "password": "password",
    "database": "remote_db",
    "port": 3306 // default is 3306
  }
}
```

And run this command from the working directory:

```
$ db-local-sync
```

You will get something like this:
```
[DB-Local-Sync] Watching for changes of remote_db in mysql://remotedatabase
[DB-Local-Sync] Database has not changed since last time...
```

Go on and make some changes on your remote database. After the time interval you've set on the **dbconfig.json** passed, you'll get this to pop up on your screen:
-
![Screenshot](screenshot.jpg)

Click on it and you're going to sync your local database. You'll get another pop up message saying

```
Booya! Databases are synced!
```

If you check your database, you'll see that there's a backup for your local database (in case you run into any problems, you can easily revert) and the changes from the remote database are there on your local database.

## TODO
- MongoDB support
- Create tests

## Contribute
Any help is more than welcome. If you've found any bug, have ideas for new features or want to help in any way, please get in touch!
