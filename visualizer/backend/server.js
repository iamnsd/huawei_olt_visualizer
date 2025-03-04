const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const snmp = require('snmp-native');

const app = express();
const db = new sqlite3.Database('config.db');

// Настройка SNMP
const session = new snmp.Session({ host: '172.35.0.4', community: 'es-manager-ro123' });

app.use(cors());
app.use(express.json());

// Функция для обновления данных в базе данных
const updateOidInDatabase = () => {
    return new Promise((resolve, reject) => {
        session.getSubtree({ oid: '.1.3.6.1.4.1.2011.6.128.1.1.2.43.1.9' }, (error, varbinds) => {
            if (error) {
                session.close();
                return reject('Ошибка SNMP: ' + error);
            }

            let promises = [];

            varbinds.forEach(varbind => {
                const oidParts = varbind.oid.slice(-2); // Последние 2 части OID
                const oidValue = oidParts.join('.'); // Собираем OID в строку
                const description = varbind.value.toString(); // Значение как строка

                // Создаем промис для каждого обновления в базе данных
                const promise = new Promise((resolve, reject) => {
                    db.run('UPDATE ont SET oid = ? WHERE desc = ?', [oidValue, description], (err) => {
                        if (err) {
                            return reject('Ошибка обновления в базе данных: ' + err);
                        }
                        resolve();
                    });
                });

                promises.push(promise);
            });

            // Дожидаемся завершения всех промисов
            Promise.all(promises)
                .then(resolve)
                .catch(reject);
        });
    });
};

// Эндпоинт для поиска ONT
app.get('/search', (req, res) => {
    const query = req.query.q || '';
    db.all("SELECT id, desc FROM ont WHERE desc LIKE ?", [`%${query}%`], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Функция для получения уровня сигнала по OID
const fetchSignalLevel = (oid) => {
    return new Promise((resolve, reject) => {
        const oidArray = oid.split('.').map(Number);
        const fullOid = [1, 3, 6, 1, 4, 1, 2011, 6, 128, 1, 1, 2, 51, 1, 4, ...oidArray];

        session.get({ oid: fullOid }, (error, varbinds) => {
            if (error) {
                return reject('Ошибка SNMP: ' + error);
            }

            if (varbinds && varbinds.length > 0 && varbinds[0].value !== undefined) {
                const rawSignal = parseInt(varbinds[0].value, 10);
                if (isNaN(rawSignal)) {
                    return reject('Ошибка преобразования значения сигнала');
                }

                const signalLevel = rawSignal / 100; // Делим на 100
                resolve(signalLevel);
            } else {
                reject('Ошибка получения сигнала');
            }
        });
    });
};


// Эндпоинт для получения деталей ONT с уровнем сигнала
app.get('/ont/:id', async (req, res) => {
    const ontId = req.params.id;
    db.get("SELECT * FROM ont WHERE id = ?", [ontId], async (err, row) => {
        if (err) {
            console.error("Ошибка при запросе данных ONT:", err);
            res.status(500).json({ error: err.message });
            return;
        }

        if (row) {
            try {
                const signalLevel = await fetchSignalLevel(row.oid);
                row.signalLevel = signalLevel;

                db.all("SELECT eth, vlan FROM port_native_vlan WHERE ont_id = ?", [ontId], (err, vlanRows) => {
                    if (err) {
                        console.error("Ошибка при запросе VLAN:", err);
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    row.vlans = vlanRows || [];

                    db.all("SELECT service_port_id, gemport, vlan FROM service_ports WHERE ont_id = ?", [ontId], (err, servicePortRows) => {
                        if (err) {
                            console.error("Ошибка при запросе сервисных портов:", err);
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        row.servicePorts = servicePortRows || [];
                        res.json(row);
                    });
                });
            } catch (error) {
                console.error("Ошибка при получении уровня сигнала:", error);
                res.status(500).json({ error: 'Ошибка получения уровня сигнала: ' + error });
            }
        } else {
            res.status(404).json({ error: "ONT не найден" });
        }
    });
});


// Эндпоинт для получения данных профиля
app.get('/profile/:id', (req, res) => {
    const profileId = req.params.id;
    db.get("SELECT * FROM profiles WHERE id = ?", [profileId], (err, profileRow) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (profileRow) {
            db.all("SELECT gem_id, vlan FROM gems WHERE profile_id = ?", [profileId], (err, gemRows) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                profileRow.gems = gemRows || [];
                res.json(profileRow);
            });
        } else {
            res.status(404).json({ error: "Профиль не найден" });
        }
    });
});

// Получение списка интерфейсов
app.get("/api/interfaces", (req, res) => {
    db.all("SELECT DISTINCT interface FROM ont", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows.map(row => row.interface));
    });
});

// Получение списка деревьев для указанного интерфейса
app.get("/api/trees", (req, res) => {
    const { interface } = req.query;
    if (!interface) {
        return res.status(400).json({ error: "Не указан параметр interface" });
    }
    db.all("SELECT DISTINCT tree FROM ont WHERE interface = ?", [interface], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows.map(row => row.tree));
    });
});

// Получение списка ONT для выбранного интерфейса и дерева
app.get("/api/onts", (req, res) => {
    const { interface, tree } = req.query;
    if (!interface || !tree) {
        return res.status(400).json({ error: "Не указаны параметры interface и tree" });
    }
    db.all("SELECT desc, sn, oid FROM ont WHERE interface = ? AND tree = ?", [interface, tree], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get("/signal", async (req, res) => {
    const { oid } = req.query;

    if (!oid) {
        return res.status(400).json({ error: "OID не указан" });
    }

    try {
        const signal = await fetchSignalLevel(oid);
        res.json({ signal });
    } catch (error) {
        res.status(500).json({ error: "Ошибка получения сигнала" });
    }
});


// Обновляем OID в базе данных и запускаем сервер после завершения
updateOidInDatabase()
    .then(() => {
        console.log('Данные в БД обновлены. Старт сервера...');

        // Запуск сервера после завершения обновления данных
        app.listen(5000, '0.0.0.0', () => {
            console.log('Сервер запущен на порту 5000');
        });
    })
    .catch((error) => {
        console.error('Ошибка при обновлении данных:', error);
    });