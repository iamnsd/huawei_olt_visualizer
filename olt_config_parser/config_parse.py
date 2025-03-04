import sqlite3
import re

# Чтение конфига из файла
with open('172.35.0.4.txt', 'r', encoding='utf-8') as file:
    config_text = file.read()

# Подключение к базе данных (или создание новой)
conn = sqlite3.connect('config.db')
cursor = conn.cursor()

# Создание таблиц
cursor.execute('''
CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY,
    name TEXT
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS gems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER,
    gem_id INTEGER,
    vlan INTEGER,
    FOREIGN KEY (profile_id) REFERENCES profiles (id)
)
''')

# Создание таблиц
cursor.execute('''
CREATE TABLE IF NOT EXISTS ont (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interface INTEGER,
    lineprofile INTEGER,
    tree INTEGER,
    ont_id INTEGER,
    oid TEXT,
    sn TEXT,
    desc TEXT,
    FOREIGN KEY (lineprofile) REFERENCES profiles (id)
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS port_native_vlan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ont_id INTEGER,
    eth INTEGER,
    vlan INTEGER,
    FOREIGN KEY (ont_id) REFERENCES ont (id)
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS service_ports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_port_id INTEGER,
    ont_id INTEGER,
    gemport INTEGER,
    vlan INTEGER,
    FOREIGN KEY (ont_id) REFERENCES ont (id)
)
''')

# Функция для парсинга profiles и gems
def parse_profiles(config_text):
    profiles = []
    gems = []
    current_profile = None
    lines = config_text.strip().splitlines()

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Обработка строки с профилем
        match = re.match(r'ont-lineprofile gpon profile-id (\d+) profile-name \"?(.*?)\"?$', line)
        if match:
            profile_id = int(match.group(1))
            profile_name = match.group(2).strip()

            # Если имя профиля не завершено (начинается с кавычки, но не заканчивается)
            if line.count('"') == 1:
                i += 1
                while i < len(lines) and not lines[i].strip().endswith('"'):
                    profile_name += ' ' + lines[i].strip()
                    i += 1
                if i < len(lines):  # Добавляем последнюю часть имени профиля
                    profile_name += ' ' + lines[i].strip().strip('"')

            current_profile = (profile_id, profile_name)
            profiles.append(current_profile)
            i += 1
            continue

        # Обработка строки с gem add
        if line.startswith("gem add"):
            parts = line.split()
            gem_id = int(parts[2])  # gem ID
            gems.append((current_profile[0], gem_id, None))  # VLAN пока неизвестен
            i += 1
            continue

        # Обработка строки с gem mapping
        if line.startswith("gem mapping"):
            parts = line.split()
            gem_id = int(parts[2])  # gem ID
            vlan = int(parts[5])  # VLAN
            for j, gem in enumerate(gems):
                if gem[0] == current_profile[0] and gem[1] == gem_id:
                    gems[j] = (gem[0], gem[1], vlan)
                    break
        i += 1

    return profiles, gems

# Функция для парсинга ont и native-vlan
def parse_ont(config_text):
    ont_data = []
    port_native_vlan_data = []
    
    current_interface = None
    current_ont = None
    
    lines = config_text.strip().splitlines()
    
    for line in lines:
        line = line.strip()
        
        if line.startswith("interface gpon"):
            parts = line.split()
            current_interface = int(parts[2].split('/')[1])
        
        elif line.startswith("ont add"):
            if current_ont:
                ont_data.append(current_ont)
                current_ont = None
            
            parts = line.split()
            tree = int(parts[2])
            ont_id = int(parts[3])
            sn = parts[5].strip('"')
            oid = None  # Добавляем OID, даже если он не найден
            
            lineprofile = None
            desc = None
            for i, part in enumerate(parts):
                if part == "ont-lineprofile-id":
                    lineprofile = int(parts[i + 1])
                elif part == "desc":
                    desc = ' '.join(parts[i + 1:]).strip('"')
                elif part == "oid":
                    oid = parts[i + 1].strip('"')  # Парсим OID, если есть
            
            current_ont = (current_interface, lineprofile, tree, ont_id, oid, sn, desc)
       
        elif line.startswith("ont-srvprofile-id"):
            if current_ont:
                parts = line.split()

                # Извлекаем lineprofile, если он есть
                if "ont-lineprofile-id" in parts:
                    lineprofile = int(parts[parts.index("ont-lineprofile-id") + 1])
                else:
                    lineprofile = current_ont[1]  # Оставляем старое значение

                    # Извлекаем desc
                desc = current_ont[6] if current_ont[6] else ""  # Оставляем предыдущее значение, если desc не найдено
                if "desc" in parts:
                    desc_index = parts.index("desc") + 1
                    desc = ' '.join(parts[desc_index:]).strip('"')

                # Обновляем кортеж и добавляем в список
                current_ont = (current_ont[0], lineprofile, current_ont[2], current_ont[3], current_ont[4], current_ont[5], desc)
                ont_data.append(current_ont)
                current_ont = None

        
        elif line.startswith("ont port native-vlan"):
            parts = line.split()
            tree = int(parts[3])
            ont_id = int(parts[4])
            eth = int(parts[6])
            vlan = int(parts[8])
            port_native_vlan_data.append((current_interface, tree, ont_id, eth, vlan))
    
    return ont_data, port_native_vlan_data

# Функция для парсинга сервисных портов
def parse_service_ports(config_text):
    service_ports_data = []
    
    # Разделение конфига на строки
    lines = config_text.strip().splitlines()
    
    for line in lines:
        line = line.strip()  # Удаляем лишние пробелы
        
        # Обработка строки с service-port
        if line.startswith("service-port"):
            parts = line.split()
            service_port_id = int(parts[1])  # Номер сервисного порта
            vlan = int(parts[3])  # VLAN
            gpon_parts = parts[5].split('/')  # Разделяем gpon 0/0/0
            interface = int(gpon_parts[1])  # Номер интерфейса
            tree = int(gpon_parts[2])  # Номер дерева
            ont_id_in_tree = int(parts[7])  # Номер ONT в дереве
            gemport = int(parts[9])  # Номер gemport
            # Сохраняем данные
            service_ports_data.append((service_port_id, interface, tree, ont_id_in_tree, gemport, vlan))
    
    return service_ports_data

# Очистка таблиц перед вставкой, чтобы избежать дубликатов
cursor.executescript('''
DELETE FROM profiles;
DELETE FROM gems;
DELETE FROM ont;
DELETE FROM port_native_vlan;
DELETE FROM service_ports;
''')
conn.commit()

profiles, gems = parse_profiles(config_text)

# Сохранение данных в базу данных
cursor.executemany('INSERT INTO profiles (id, name) VALUES (?, ?)', profiles)
cursor.executemany('INSERT INTO gems (profile_id, gem_id, vlan) VALUES (?, ?, ?)', gems)

# Сохранение изменений
conn.commit()

ont_data, port_native_vlan_data = parse_ont(config_text)
# Сохранение данных в таблицу ont
cursor.executemany('INSERT INTO ont (interface, lineprofile, tree, ont_id, oid, sn, desc) VALUES (?, ?, ?, ?, ?, ?, ?)', ont_data)

# Получаем id добавленных ONT
cursor.execute('SELECT id, interface, tree, ont_id FROM ont')
ont_records = cursor.fetchall()

# Создаем словарь для быстрого поиска id ONT по интерфейсу, дереву и ont_id
ont_dict = {(record[1], record[2], record[3]): record[0] for record in ont_records}

# Сохранение данных в таблицу port_native_vlan
for entry in port_native_vlan_data:
    interface, tree, ont_id, eth, vlan = entry
    ont_key = (interface, tree, ont_id)
    if ont_key in ont_dict:
        cursor.execute('INSERT INTO port_native_vlan (ont_id, eth, vlan) VALUES (?, ?, ?)',
                       (ont_dict[ont_key], eth, vlan))

# Сохранение изменений
conn.commit()

service_ports_data = parse_service_ports(config_text)

# Сохранение данных в таблицу service_ports
for entry in service_ports_data:
    service_port_id, interface, tree, ont_id_in_tree, gemport, vlan = entry
    ont_key = (interface, tree, ont_id_in_tree)
    if ont_key in ont_dict:
        ont_id = ont_dict[ont_key]  # Получаем id ONT из таблицы ont
        cursor.execute('INSERT INTO service_ports (service_port_id, ont_id, gemport, vlan) VALUES (?, ?, ?, ?)',
                       (service_port_id, ont_id, gemport, vlan))
    else:
        print(f"ONT не найдена: интерфейс {interface}, дерево {tree}, ont_id {ont_id_in_tree}")

# Сохранение изменений и закрытие соединения
conn.commit()
conn.close()