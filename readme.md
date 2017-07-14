# DB-Local-Sync
## What is it?
DB-Local-Sync is a very small nodejs package that keeps your local database in sync with a remote database, for development purposes.

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
  "interval": 5, // in minutes
  
  "local": { // local database settings
    "host": "localhost",
    "user": "root",
    "password": "password",
    "database": "local_db"
  },
  
  "remote": { // remote database settings
    "host": "mysql://remotedatabase",
    "user": "root",
    "password": "password",
    "database": "remote_db"
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

Go on and make some change on you remote database. You'll get this to pop up on your screen:


## TODO
- MongoDB support
- Create tests
