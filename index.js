#!/usr/bin/env node

const del = require('del');
const path = require('path');
const dbConfig = require(path.join(process.cwd(), 'dbconfig.json'));
const dump = require('mysqldump');
const importer = require('node-mysql-importer');
const mysql = require('mysql');
const notifier = require('node-notifier');
const _ = require('lodash');

const stamp = '[DB-Local-Sync]';
const interval = dbConfig.interval * 60000;
const local = mysql.createConnection(Object.assign({multipleStatements: true}, dbConfig.local));
const remote = mysql.createConnection(Object.assign({multipleStatements: true}, dbConfig.remote));

let localDatabase,
    remoteDatabase;

// Functions

const backupDatabase = () => {
    const config = Object.assign({
        dest: `./${dbConfig.local.database}.tmp.sql`
    }, dbConfig.local);

    if(localDatabase) {
        dump(config, (err) => {

            if (err) {
                throw err;
            }

            local.query(`USE ${config.database}_backup`, (err, res) => {
                const exists = !!res;

                if (!exists) {
                    createDatabase(`${config.database}_backup`, importBackupDatabase);
                } else {
                    clearDatabase(`${dbConfig.local.database}_backup`, importBackupDatabase);
                }
            });

        });
    } else {
        updateDatabase();
    }

    console.log(`${stamp} Backing up database...`);
};

const check = () => {
    if(!localDatabase) {
        getTables('local', () => {
            getTables('remote', compareDatabases);
        });
    } else {
        getTables('remote', compareDatabases);
    }
};

const clearDatabase = (database, callback) => {
    console.log('Clearing backup');

    local.query(`DROP DATABASE ${database}; CREATE DATABASE ${database}`, (err, res) => {
        if (!err) {
            callback();
        } else {
            throw err;
        }
    });
};

const compareDatabases = () => {
    const hasChanges = !_.isEqual(localDatabase, remoteDatabase);

    if (hasChanges) {
        notify({
            actions: 'Update',
            callback: backupDatabase,
            title: 'Remote database is updated!',
            message: 'Click here to sync your local database',
            wait: true
        });
    } else {
        console.log(`${stamp} Database has not changed since last time...`);
    }
};

const createDatabase = (database, callback) => {
    local
        .query(`CREATE DATABASE IF NOT EXISTS ${database}`, (err) => {
            if (!err) {
                callback();
            } else {
                throw err;
            }
        });
};

const getTables = (context, callback) => {
    const conn = (context === 'local') ? local : remote;
    const queries = [];

    conn
        .query('SHOW TABLES', (err, res) => {
            if (err) {
                console.log(err);
            }

            _.each(res, (table) => {
                for (var k in table) {
                    queries.push(`SELECT * FROM ${table[k]}`);
                }
            });

            if(queries.length) {
                conn
                    .query(queries.join(';'), (err, res, fields) => {
                        if (!err) {
                            if (context === 'local') {
                                localDatabase = res;
                            } else {
                                remoteDatabase = res;
                            }

                            callback();
                        } else {
                            console.log(err);
                        }
                    });
            } else {
                localDatabase = null;
                callback();
            }
        });
};

const importBackupDatabase = () => {
    const config = Object.assign({}, dbConfig.local);

    config.database = `${dbConfig.local.database}_backup`;

    importer.config(config);

    importer
        .importSQL(`./${dbConfig.local.database}.tmp.sql`)
        .then(() => {
            clearDatabase(dbConfig.local.database, updateDatabase);
        })
        .catch(err => {
            console.log(`error: ${err}`)
        });

};

const notify = (opts) => {
    const options = Object.assign({
        icon: path.join(__dirname, 'assets/img/logo.png'),
    }, opts);

    notifier.notify(options, (err, res) => {
        if (err) {
            throw err;
        }

        if (res === 'activate' && opts.callback) {
            opts.callback();
        }
    });
};

const updateDatabase = () => {
    const dumpFile = `./${dbConfig.remote.database}.tmp.sql`;
    const dumpConfig = Object.assign({dest: dumpFile}, dbConfig.remote);
    const importerConfig = dbConfig.local;

    dump(dumpConfig, (err) => {
        if (!err) {
            importer.config(importerConfig);

            importer
                .importSQL(dumpFile)
                .then(() => {
                    localDatabase = remoteDatabase;

                    del([
                        path.join(process.cwd(), `${dbConfig.local.database}.tmp.sql`),
                        path.join(process.cwd(), `${dbConfig.remote.database}.tmp.sql`)
                    ]);

                    notify({
                        title: 'DB-Local-Sync',
                        message: 'Booya! Databases are synced!'
                    });

                    console.log(`${stamp} `);
                })
                .catch(err => {
                    console.log(`error: ${err}`)
                });
        } else {
            throw err;
        }

    });

    console.log(`${stamp} Updating local database...`);
};

local.connect();
remote.connect();

console.log(`${stamp} Watching for changes of ${dbConfig.remote.database} in ${dbConfig.remote.host}`);

// Create an interval to check the remote database
setInterval(() => {

    check();

}, interval);

// Do a check
check();
