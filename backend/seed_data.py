#!/usr/bin/env python
"""
Script para poblar la base de datos con datos de prueba realistas
para el sistema de mantenimiento de equipos de TI de Chivas.
"""
import os
import django
from datetime import date, timedelta
from random import choice, randint, sample

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from equipos.models import Equipo
from mantenimientos.models import Mantenimiento, ChecklistItem, ChecklistRespuesta, Firma
from django.contrib.auth.models import User

# Limpiar datos existentes
print("🗑️  Limpiando datos existentes...")
Firma.objects.all().delete()
ChecklistRespuesta.objects.all().delete()
Mantenimiento.objects.all().delete()
Equipo.objects.all().delete()
ChecklistItem.objects.all().delete()

# ─── CATÁLOGO DE CHECKLIST ────────────────────────────────────────
print("📋 Creando catálogo de checklist...")
checklist_items = [
    # Hardware
    ChecklistItem(categoria='hardware', nombre='Verificar estado físico del equipo', orden=1),
    ChecklistItem(categoria='hardware', nombre='Revisar conexiones de cables', orden=2),
    ChecklistItem(categoria='hardware', nombre='Inspeccionar ventiladores y disipadores', orden=3),
    ChecklistItem(categoria='hardware', nombre='Verificar integridad de puertos USB/HDMI', orden=4),
    
    # Software
    ChecklistItem(categoria='software', nombre='Actualizar sistema operativo', orden=5),
    ChecklistItem(categoria='software', nombre='Actualizar antivirus y ejecutar escaneo', orden=6),
    ChecklistItem(categoria='software', nombre='Verificar licencias de software', orden=7),
    ChecklistItem(categoria='software', nombre='Limpiar archivos temporales', orden=8),
    
    # Red
    ChecklistItem(categoria='red', nombre='Verificar conectividad de red', orden=9),
    ChecklistItem(categoria='red', nombre='Probar velocidad de conexión', orden=10),
    ChecklistItem(categoria='red', nombre='Revisar configuración de firewall', orden=11),
    
    # Seguridad
    ChecklistItem(categoria='seguridad', nombre='Verificar respaldos automáticos', orden=12),
    ChecklistItem(categoria='seguridad', nombre='Revisar políticas de contraseñas', orden=13),
    ChecklistItem(categoria='seguridad', nombre='Auditar accesos y permisos', orden=14),
]
ChecklistItem.objects.bulk_create(checklist_items)
print(f"   ✓ {len(checklist_items)} items de checklist creados")

# ─── EQUIPOS ───────────────────────────────────────────────────────
print("\n💻 Creando equipos...")

ubicaciones = [
    'Oficinas Verde Valle - Piso 2',
    'Oficinas Verde Valle - Piso 3',
    'Estadio Akron - Área administrativa',
    'Estadio Akron - Sala de prensa',
    'Centro de Alto Rendimiento',
    'Tienda oficial Guadalajara',
    'Academia Chivas - Dirección',
]

colaboradores = [
    ('Juan Pérez García', 'juan.perez@chivas.mx', 'Director de Tecnología'),
    ('María González López', 'maria.gonzalez@chivas.mx', 'Analista de Datos'),
    ('Carlos Ramírez Torres', 'carlos.ramirez@chivas.mx', 'Coordinador de Medios'),
    ('Ana Martínez Ruiz', 'ana.martinez@chivas.mx', 'Jefa de Recursos Humanos'),
    ('Luis Hernández Castro', 'luis.hernandez@chivas.mx', 'Contador'),
    ('Patricia Sánchez Díaz', 'patricia.sanchez@chivas.mx', 'Community Manager'),
    ('Roberto Flores Morales', 'roberto.flores@chivas.mx', 'Analista de Video'),
    ('Laura Jiménez Vargas', 'laura.jimenez@chivas.mx', 'Diseñadora Gráfica'),
    ('Miguel Ángel Cruz', 'miguel.cruz@chivas.mx', 'Coordinador de Ticketing'),
    ('Sofía Reyes Mendoza', 'sofia.reyes@chivas.mx', 'Asistente de Dirección'),
]

equipos_data = [
    # Laptops
    {'tipo': 'laptop', 'marca': 'Dell', 'modelo': 'Latitude 5430', 'serie': 'DL5430-2024-001'},
    {'tipo': 'laptop', 'marca': 'HP', 'modelo': 'EliteBook 840 G9', 'serie': 'HP840-2024-002'},
    {'tipo': 'laptop', 'marca': 'Lenovo', 'modelo': 'ThinkPad X1 Carbon', 'serie': 'LNX1C-2023-003'},
    {'tipo': 'laptop', 'marca': 'Dell', 'modelo': 'XPS 15', 'serie': 'DLXPS-2024-004'},
    {'tipo': 'laptop', 'marca': 'MacBook Pro', 'modelo': '14" M3', 'serie': 'MBP14-2024-005'},
    {'tipo': 'laptop', 'marca': 'HP', 'modelo': 'ZBook Studio G10', 'serie': 'HPZB-2024-006'},
    
    # Desktops
    {'tipo': 'desktop', 'marca': 'Dell', 'modelo': 'OptiPlex 7090', 'serie': 'DLOP7-2023-007'},
    {'tipo': 'desktop', 'marca': 'HP', 'modelo': 'ProDesk 600 G6', 'serie': 'HPPD6-2023-008'},
    {'tipo': 'desktop', 'marca': 'Lenovo', 'modelo': 'ThinkCentre M90', 'serie': 'LNTC9-2024-009'},
    {'tipo': 'desktop', 'marca': 'Dell', 'modelo': 'Precision 3660', 'serie': 'DLP36-2024-010'},
    
    # Servidores
    {'tipo': 'servidor', 'marca': 'Dell', 'modelo': 'PowerEdge R750', 'serie': 'DLPE7-2023-011'},
    {'tipo': 'servidor', 'marca': 'HP', 'modelo': 'ProLiant DL380 Gen10', 'serie': 'HPDL3-2023-012'},
    {'tipo': 'servidor', 'marca': 'Dell', 'modelo': 'PowerEdge R640', 'serie': 'DLPE6-2022-013'},
    
    # Impresoras
    {'tipo': 'impresora', 'marca': 'HP', 'modelo': 'LaserJet Pro M404dn', 'serie': 'HPLJ4-2023-014'},
    {'tipo': 'impresora', 'marca': 'Canon', 'modelo': 'imageRUNNER 2625', 'serie': 'CNIR2-2023-015'},
    {'tipo': 'impresora', 'marca': 'Epson', 'modelo': 'EcoTank L3250', 'serie': 'EPET3-2024-016'},
    
    # Switches
    {'tipo': 'switch', 'marca': 'Cisco', 'modelo': 'Catalyst 2960-X', 'serie': 'CSC29X-2022-017'},
    {'tipo': 'switch', 'marca': 'HP', 'modelo': 'Aruba 2930F', 'serie': 'HPAR29-2023-018'},
    {'tipo': 'switch', 'marca': 'Cisco', 'modelo': 'Catalyst 9300', 'serie': 'CSC93-2024-019'},
    
    # Routers
    {'tipo': 'router', 'marca': 'Cisco', 'modelo': 'ISR 4331', 'serie': 'CSISR4-2023-020'},
    {'tipo': 'router', 'marca': 'MikroTik', 'modelo': 'RB5009UG+S+IN', 'serie': 'MKRB5-2024-021'},
    
    # Monitores
    {'tipo': 'monitor', 'marca': 'Dell', 'modelo': 'UltraSharp U2723DE', 'serie': 'DLUS27-2024-022'},
    {'tipo': 'monitor', 'marca': 'LG', 'modelo': '27UP850-W', 'serie': 'LG27UP-2024-023'},
    {'tipo': 'monitor', 'marca': 'Samsung', 'modelo': 'Odyssey G5', 'serie': 'SMOG5-2023-024'},
    
    # Tablets
    {'tipo': 'tablet', 'marca': 'iPad', 'modelo': 'Pro 12.9" M2', 'serie': 'IPP12-2024-025'},
    {'tipo': 'tablet', 'marca': 'Samsung', 'modelo': 'Galaxy Tab S9', 'serie': 'SMTS9-2024-026'},
]

equipos = []
for i, eq_data in enumerate(equipos_data):
    colab = colaboradores[i % len(colaboradores)]
    ubicacion = ubicaciones[i % len(ubicaciones)]
    
    # Fecha de último mantenimiento: entre 1 y 180 días atrás
    dias_atras = randint(1, 180)
    fecha_ultimo = date.today() - timedelta(days=dias_atras)
    
    # Fecha próximo mantenimiento: entre 30 y 90 días desde el último
    dias_proximos = randint(30, 90)
    fecha_proximo = fecha_ultimo + timedelta(days=dias_proximos)
    
    # Algunos equipos de baja
    activo = i < len(equipos_data) - 3  # últimos 3 dados de baja
    
    equipo = Equipo(
        codigo_interno=f"CHV-{eq_data['tipo'][:3].upper()}-{str(i+1).zfill(4)}",
        tipo_equipo=eq_data['tipo'],
        marca=eq_data['marca'],
        modelo=eq_data['modelo'],
        numero_serie=eq_data['serie'],
        ubicacion=ubicacion,
        colaborador_nombre=colab[0],
        colaborador_correo=colab[1],
        colaborador_puesto=colab[2],
        fecha_ultimo_mantenimiento=fecha_ultimo if activo else None,
        fecha_proximo_mantenimiento=fecha_proximo if activo else None,
        activo=activo,
        motivo_baja=None if activo else choice([
            'Equipo obsoleto - reemplazo programado',
            'Daño irreparable - costo de reparación excede valor',
            'Fin de vida útil - fuera de garantía'
        ]),
        fecha_baja=None if activo else date.today() - timedelta(days=randint(5, 30)),
    )
    equipos.append(equipo)

Equipo.objects.bulk_create(equipos)
print(f"   ✓ {len(equipos)} equipos creados ({len([e for e in equipos if e.activo])} activos, {len([e for e in equipos if not e.activo])} de baja)")

# ─── MANTENIMIENTOS ────────────────────────────────────────────────
print("\n🔧 Creando mantenimientos...")

tecnicos = [
    'Ing. Roberto Guzmán Silva',
    'Lic. Fernando Castillo Pérez',
    'Ing. Diana Moreno Ortiz',
    'Téc. Jorge Navarro Ruiz',
]

departamentos = [
    'Tecnología e Innovación',
    'Sistemas y Redes',
    'Soporte Técnico',
    'Infraestructura TI',
]

mantenimientos = []
equipos_activos = [e for e in equipos if e.activo]

# Crear entre 2-4 mantenimientos por equipo activo
for equipo in equipos_activos[:15]:  # Solo primeros 15 para no saturar
    num_mants = randint(2, 4)
    
    for j in range(num_mants):
        # Mantenimientos distribuidos en los últimos 12 meses
        dias_atras = randint(30, 365)
        fecha_ejec = date.today() - timedelta(days=dias_atras)
        
        # El último mantenimiento puede estar abierto (10% probabilidad)
        es_ultimo = j == num_mants - 1
        estatus = 'abierto' if (es_ultimo and randint(1, 10) == 1) else 'cerrado'
        
        tecnico = choice(tecnicos)
        depto = choice(departamentos)
        
        actividades = choice([
            'Limpieza física del equipo, actualización de sistema operativo, verificación de hardware.',
            'Instalación de actualizaciones críticas, optimización de disco, respaldo de datos.',
            'Reemplazo de pasta térmica, limpieza de ventiladores, pruebas de estrés.',
            'Actualización de drivers, configuración de red, instalación de software corporativo.',
            'Mantenimiento preventivo completo, verificación de licencias, auditoría de seguridad.',
        ])
        
        materiales = choice([
            'Alcohol isopropílico, paños de microfibra, aire comprimido.',
            'Pasta térmica Arctic MX-4, kit de limpieza.',
            'Cable de red Cat6, adaptador HDMI, mouse inalámbrico.',
            'Disco SSD Kingston 500GB, memoria RAM 16GB DDR4.',
            'N/A - Solo mantenimiento preventivo',
        ])
        
        estado_post = choice(['operativo', 'operativo_observaciones', 'requiere_seguimiento'])
        
        observaciones = choice([
            'Equipo funcionando correctamente. Sin incidencias.',
            'Se recomienda upgrade de RAM en próximo mantenimiento.',
            'Batería al 78% de capacidad. Considerar reemplazo en 6 meses.',
            'Ventilador con ruido leve. Monitorear en próxima revisión.',
            'Equipo en óptimas condiciones. Rendimiento dentro de parámetros.',
        ])
        
        riesgo = randint(1, 10) <= 2  # 20% tienen riesgo
        
        mant = Mantenimiento(
            equipo=equipo,
            departamento_area=depto,
            responsable_area=equipo.colaborador_nombre,
            tecnico_nombre=tecnico,
            fecha_ejecucion=fecha_ejec,
            hora_inicio=f"{randint(8, 16):02d}:{choice(['00', '30'])}",
            hora_fin=f"{randint(9, 17):02d}:{choice(['00', '30'])}",
            actividades_realizadas=actividades,
            materiales_utilizados=materiales,
            estado_equipo_post=estado_post,
            observaciones_tecnico=observaciones,
            riesgo_presentado=riesgo,
            descripcion_riesgo='Sobrecalentamiento detectado durante pruebas de estrés.' if riesgo else '',
            acciones_tomadas='Limpieza profunda de ventiladores y reemplazo de pasta térmica.' if riesgo else '',
            fecha_sugerida_proximo_mantenimiento=fecha_ejec + timedelta(days=90) if estatus == 'cerrado' else None,
            estatus=estatus,
        )
        mantenimientos.append(mant)

Mantenimiento.objects.bulk_create(mantenimientos)
print(f"   ✓ {len(mantenimientos)} mantenimientos creados")

# ─── CHECKLIST Y FIRMAS ────────────────────────────────────────────
print("\n✅ Agregando checklists y firmas...")

checklist_items_db = list(ChecklistItem.objects.all())
mantenimientos_cerrados = [m for m in mantenimientos if m.estatus == 'cerrado']

respuestas = []
firmas = []

for mant in mantenimientos_cerrados[:20]:  # Solo primeros 20 para no saturar
    # Checklist: 80-100% completado
    items_a_completar = sample(checklist_items_db, k=randint(int(len(checklist_items_db)*0.8), len(checklist_items_db)))
    
    for item in items_a_completar:
        realizado = choice([True, True, True, False])  # 75% realizado
        resp = ChecklistRespuesta(
            mantenimiento=mant,
            checklist_item=item,
            realizado=realizado,
            observacion='' if realizado else choice([
                'Requiere atención en próximo mantenimiento',
                'Pendiente de autorización',
                'No aplica para este equipo',
            ])
        )
        respuestas.append(resp)
    
    # Firmas
    firmas.append(Firma(
        mantenimiento=mant,
        tipo_firma='TECNICO',
        nombre_firmante=mant.tecnico_nombre,
        cargo_firmante='Técnico de Soporte',
        firma_imagen='firmas/dummy_firma_tecnico.png',
    ))
    
    firmas.append(Firma(
        mantenimiento=mant,
        tipo_firma='USUARIO',
        nombre_firmante=mant.responsable_area,
        cargo_firmante='Responsable de Área',
        firma_imagen='firmas/dummy_firma_usuario.png',
    ))

ChecklistRespuesta.objects.bulk_create(respuestas)
Firma.objects.bulk_create(firmas)

print(f"   ✓ {len(respuestas)} respuestas de checklist creadas")
print(f"   ✓ {len(firmas)} firmas creadas")

# ─── RESUMEN ───────────────────────────────────────────────────────
print("\n" + "="*60)
print("✨ SEED COMPLETADO")
print("="*60)
print(f"📊 Equipos totales:        {Equipo.objects.count()}")
print(f"   • Activos:              {Equipo.objects.filter(activo=True).count()}")
print(f"   • Dados de baja:        {Equipo.objects.filter(activo=False).count()}")
print(f"🔧 Mantenimientos:         {Mantenimiento.objects.count()}")
print(f"   • Cerrados:             {Mantenimiento.objects.filter(estatus='cerrado').count()}")
print(f"   • Abiertos:             {Mantenimiento.objects.filter(estatus='abierto').count()}")
print(f"📋 Items de checklist:     {ChecklistItem.objects.count()}")
print(f"✅ Respuestas checklist:   {ChecklistRespuesta.objects.count()}")
print(f"✍️  Firmas:                 {Firma.objects.count()}")
print("="*60)
print("\n🎉 ¡Base de datos lista para el MVP!")
print("   Accede a http://localhost/admin para ver los datos")
print("   Usuario: (crear con 'python manage.py createsuperuser')")
