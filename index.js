#!/usr/bin/env node
const del = require('del');
const path = require('path');
const dbConfig = require(path.join(process.cwd(), 'dbconfig.json'));
const dump = require('mysqldump');
const importer = require('node-mysql-importer');
const mysql = require('mysql');
const notifier = require('node-notifier');
const _ = require('lodash');

const defaultError = 'Error detected. Please check your terminal...';
const title = 'DB-Local-Sync';
const stamp = `[${title}]`;
const interval = dbConfig.interval * 60000;

const local = mysql.createConnection(Object.assign({
    dateStrings: true,
    typeCast: false,
    multipleStatements: true
}, dbConfig.local));
const remote = mysql.createConnection(Object.assign({
    dateStrings: true,
    typeCast: false,
    multipleStatements: true
}, dbConfig.remote));

let localDatabase,
    remoteDatabase;

// Functions

const backupDatabase = () => {
    const config = Object.assign({
        dest: `./${dbConfig.local.database}.tmp.sql`
    }, dbConfig.local);

    if (localDatabase) {
        console.log(`${stamp} Backing up database...`);

        dump(config, (err) => {

            if (!err) {
                const dumpConfig = Object.assign({getDump: true}, dbConfig.local);

                dump(dumpConfig, (err, query) => {
                    if (!err) {
                        local
                            .query(`
                            DROP DATABASE IF EXISTS ${dbConfig.local.database}_backup; 
                            CREATE DATABASE ${dbConfig.local.database}_backup; 
                            USE ${dbConfig.local.database}_backup;
                            ${query}`, (err) => {
                                if(!err) {
                                    updateDatabase();
                                } else {
                                    throw err;
                                }
                            });
                    }
                });
            } else {
                notify({
                    message: defaultError,
                    title: title
                });

                throw err;
            }

        });
    } else {
        updateDatabase();
    }
};

const check = () => {
    if (!localDatabase) {
        getTables('local', () => {
            getTables('remote', compareDatabases);
        });
    } else {
        getTables('remote', compareDatabases);
    }
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

const getTables = (context, callback) => {
    const conn = (context === 'local') ? local : remote;
    const queries = [];

    conn
        .query('SHOW TABLES', (err, res) => {
            if (!err) {
                _.each(res, (table) => {
                    for (let k in table) {
                        queries.push(`SELECT * FROM ${table[k]}`);
                    }
                });

                if (queries.length) {
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
                                notify({
                                    message: defaultError,
                                    title: title
                                });

                                throw err;
                            }
                        });
                } else {
                    localDatabase = null;
                    callback();
                }
            } else {
                notify({
                    message: defaultError,
                    title: title
                });

                throw err;
            }
        });

    console.log(`${stamp} Fetching ${context} database... (This may take awhile)`)
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
    console.log(`${stamp} Updating local database...`);

    const dumpConfig = Object.assign({getDump: true}, dbConfig.remote);

    dump(dumpConfig, (err, query) => {
        if (!err) {
            local
                .query(`DROP DATABASE IF EXISTS ${dbConfig.local.database}; CREATE DATABASE ${dbConfig.local.database}; USE ${dbConfig.local.database}; ${query}`, (err) => {
                    if(!err) {
                        del([path.join(process.cwd(), `${dbConfig.local.database}.tmp.sql`)]);

                        notify({
                            message: 'Databases are synced!',
                            title: 'DB-Local-Sync'
                        });

                        console.log(`${stamp} Booya! Databases are synced!`);
                        console.log(`${stamp} Still watching for changes of ${dbConfig.remote.database} in ${dbConfig.remote.host}`);
                    } else {
                        notify({
                            message: defaultError,
                            title: title
                        });

                        throw err;
                    }
                });
        } else {

            throw err;
        }
    });
};

local.connect();
remote.connect();

// Create an interval to check the remote database
setInterval(() => {

    check();

}, interval);

// Do a check
if(!dbConfig.strictMode) {
    local.query('SET GLOBAL sql_mode=""', (err) => {
        if(!err) {
            check();
        } else {
            throw err;
        }
    });
} else {
    check();
}

console.log(`${stamp} Watching for changes of ${dbConfig.remote.database} in ${dbConfig.remote.host}`);