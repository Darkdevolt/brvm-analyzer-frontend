#!/usr/bin/env python3
"""
BRVM Scraper - Récupère les données depuis brvm.org
"""

import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime
import time
import sys
import re

class BRVMScraper:
    def __init__(self):
        self.base_url = "https://www.brvm.org"
        self.actions_url = "https://www.brvm.org/fr/cours-actions/0"
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        }
        
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
    def fetch_actions_data(self):
        """Récupère les données des actions depuis la page principale"""
        print(f"Scraping BRVM actions from: {self.actions_url}")
        
        try:
            response = self.session.get(self.actions_url, timeout=30)
            response.raise_for_status()
            
            # Check if we got the page
            if response.status_code != 200:
                print(f"Erreur HTTP: {response.status_code}")
                return None
                
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract stocks data
            stocks = self.extract_stocks_from_table(soup)
            
            # Extract market indices
            indices = self.extract_market_indices(soup)
            
            market_data = {
                'timestamp': datetime.now().isoformat(),
                'source': self.actions_url,
                'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'market': 'BRVM',
                'stocks': stocks,
                'indices': indices,
                'metadata': {
                    'total_stocks': len(stocks),
                    'scraping_method': 'bs4',
                    'version': '1.0'
                }
            }
            
            return market_data
            
        except requests.exceptions.RequestException as e:
            print(f"Erreur de requête: {e}")
            return None
        except Exception as e:
            print(f"Erreur inattendue: {e}")
            return None
    
    def extract_stocks_from_table(self, soup):
        """Extrait les données des actions depuis la table HTML"""
        stocks = []
        
        # Trouver la table principale - A ADAPTER SELON LE SITE
        # Essayez différents sélecteurs
        table_selectors = [
            {'id': 'table_cours'},
            {'class': 'table-cours'},
            {'class': 'cours-table'},
            {'id': 'dataTable'},
            {'class': 'table'},
            {'id': 'actions-table'}
        ]
        
        table = None
        for selector in table_selectors:
            table = soup.find('table', selector)
            if table:
                print(f"Table trouvée avec sélecteur: {selector}")
                break
        
        if not table:
            print("Table non trouvée. Structure HTML actuelle:")
            print(soup.prettify()[:2000])
            return []
        
        # Extraire les lignes
        rows = table.find_all('tr')
        if not rows:
            return []
        
        # Parcourir les lignes (sauter l'en-tête)
        for i, row in enumerate(rows[1:], 1):
            try:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 5:
                    continue
                
                # Extraction des données - À ADAPTER selon la structure réelle
                stock = {
                    'symbol': self.clean_text(cells[0].text),
                    'name': self.clean_text(cells[1].text),
                    'last_price': self.parse_price(cells[2].text),
                    'variation': self.parse_percentage(cells[3].text),
                    'volume': self.parse_number(cells[4].text),
                    'open': self.parse_price(cells[5].text) if len(cells) > 5 else None,
                    'high': self.parse_price(cells[6].text) if len(cells) > 6 else None,
                    'low': self.parse_price(cells[7].text) if len(cells) > 7 else None,
                    'previous_close': self.parse_price(cells[8].text) if len(cells) > 8 else None,
                    'timestamp': datetime.now().isoformat(),
                    'row_index': i
                }
                
                # Calculer la valeur
                stock['value'] = stock['last_price'] * stock['volume'] if stock['last_price'] and stock['volume'] else 0
                
                # Déterminer le secteur basé sur le symbole (exemple)
                stock['sector'] = self.guess_sector(stock['symbol'])
                
                stocks.append(stock)
                
            except Exception as e:
                print(f"Erreur ligne {i}: {e}")
                continue
        
        return stocks
    
    def extract_market_indices(self, soup):
        """Extrait les indices du marché"""
        indices = []
        
        # Chercher les indices - À ADAPTER
        indices_selectors = [
            {'class': 'indices'},
            {'id': 'indices'},
            {'class': 'market-indices'},
            {'id': 'market-indices'}
        ]
        
        indices_section = None
        for selector in indices_selectors:
            indices_section = soup.find('div', selector)
            if indices_section:
                break
        
        if indices_section:
            # Extraire les indices selon la structure
            # À adapter selon le HTML réel
            pass
        
        # Valeurs par défaut pour la démo
        indices = [
            {'name': 'BRVM Composite', 'value': 145.67, 'change': 0.45},
            {'name': 'BRVM 10', 'value': 128.34, 'change': 0.32},
            {'name': 'BRVM AGR', 'value': 112.89, 'change': -0.12},
            {'name': 'BRVM DIST', 'value': 98.76, 'change': 0.67}
        ]
        
        return indices
    
    def guess_sector(self, symbol):
        """Devine le secteur basé sur le symbole"""
        sectors = {
            'BICIS': 'Banque',
            'BOAB': 'Banque',
            'BOAN': 'Banque',
            'BSSL': 'Ciment',
            'CABC': 'Brasserie',
            'ETIT': 'Télécom',
            'FTBC': 'Banque',
            'NEIC': 'Assurance',
            'ONTBF': 'Télécom',
            'PALC': 'Ciment',
            'SAFC': 'Finance',
            'SGBC': 'Banque',
            'SICC': 'Ciment',
            'SIVC': 'Immobilier',
            'SLBC': 'Banque',
            'SMBC': 'Banque',
            'SNTS': 'Télécom',
            'SOGC': 'Pétrole',
            'SPHC': 'Pharma',
            'STAC': 'Assurance',
            'STBC': 'Banque',
            'TTLS': 'Logistique',
            'UNLC': 'Assurance'
        }
        
        return sectors.get(symbol, 'Divers')
    
    def clean_text(self, text):
        """Nettoie le texte"""
        if not text:
            return ''
        return text.strip().replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
    
    def parse_price(self, text):
        """Convertit un texte en prix"""
        try:
            # Enlever espaces, devises, etc.
            cleaned = re.sub(r'[^\d.,-]', '', str(text))
            cleaned = cleaned.replace(',', '').strip()
            
            if not cleaned:
                return 0.0
            
            # Gérer les nombres négatifs
            if cleaned.startswith('-'):
                return -float(cleaned[1:]) if cleaned[1:] else 0.0
            
            return float(cleaned) if cleaned else 0.0
            
        except:
            return 0.0
    
    def parse_percentage(self, text):
        """Convertit un pourcentage"""
        try:
            cleaned = re.sub(r'[^\d.,-]', '', str(text))
            cleaned = cleaned.replace(',', '.').replace('%', '').strip()
            
            if not cleaned:
                return 0.0
            
            # Gérer les signes
            if '%' in str(text) and '+' in str(text):
                return float(cleaned)
            elif '%' in str(text) and '-' in str(text):
                return -float(cleaned)
            
            return float(cleaned) if cleaned else 0.0
            
        except:
            return 0.0
    
    def parse_number(self, text):
        """Convertit un nombre avec séparateurs"""
        try:
            cleaned = re.sub(r'[^\d]', '', str(text))
            return int(cleaned) if cleaned else 0
        except:
            return 0
    
    def save_data(self, data, filename):
        """Sauvegarde les données en JSON"""
        try:
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"Données sauvegardées: {filename}")
            print(f"Nombre d'actions: {len(data.get('stocks', []))}")
            
            # Sauvegarde historique
            self.save_historical(data)
            
            return True
            
        except Exception as e:
            print(f"Erreur sauvegarde: {e}")
            return False
    
    def save_historical(self, data):
        """Sauvegarde une copie historique"""
        try:
            hist_dir = os.path.join('data', 'historique')
            os.makedirs(hist_dir, exist_ok=True)
            
            date_str = datetime.now().strftime('%Y-%m-%d')
            time_str = datetime.now().strftime('%H%M')
            
            hist_file = os.path.join(hist_dir, f'stocks_{date_str}_{time_str}.json')
            
            with open(hist_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            print(f"Erreur sauvegarde historique: {e}")

def main():
    """Fonction principale"""
    print("=" * 60)
    print("BRVM DATA SCRAPER")
    print(f"Début: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    scraper = BRVMScraper()
    
    # Scraping des données
    print("\n📊 Scraping des données actions...")
    market_data = scraper.fetch_actions_data()
    
    if market_data and market_data.get('stocks'):
        # Sauvegarde principale
        scraper.save_data(market_data, 'data/stocks.json')
        
        # Sauvegarde des indices séparément
        if market_data.get('indices'):
            indices_data = {
                'timestamp': market_data['timestamp'],
                'indices': market_data['indices']
            }
            scraper.save_data(indices_data, 'data/indices.json')
        
        # Aperçu des données
        print("\n✅ Scraping réussi!")
        print(f"📈 Actions récupérées: {len(market_data['stocks'])}")
        print(f"⏰ Dernière mise à jour: {market_data['last_updated']}")
        
        # Aperçu des premières actions
        print("\n🔍 Aperçu des données:")
        for i, stock in enumerate(market_data['stocks'][:3], 1):
            print(f"  {i}. {stock['symbol']}: {stock['last_price']} XOF ({stock['variation']}%)")
        
    else:
        print("\n❌ Échec du scraping")
        print("Création de données d'exemple...")
        
        # Données d'exemple en cas d'échec
        sample_data = create_sample_data()
        scraper.save_data(sample_data, 'data/stocks.json')
    
    print("\n" + "=" * 60)
    print(f"Fin: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

def create_sample_data():
    """Crée des données d'exemple si le scraping échoue"""
    sample_stocks = [
        {
            'symbol': 'BICIS',
            'name': 'BICI-S',
            'last_price': 14500,
            'variation': 1.25,
            'volume': 12500,
            'open': 14300,
            'high': 14600,
            'low': 14250,
            'previous_close': 14320,
            'sector': 'Banque',
            'value': 181250000
        },
        {
            'symbol': 'ETIT',
            'name': 'ETIT',
            'last_price': 8900,
            'variation': -0.56,
            'volume': 8900,
            'open': 8950,
            'high': 9000,
            'low': 8850,
            'previous_close': 8950,
            'sector': 'Télécom',
            'value': 79210000
        },
        {
            'symbol': 'SGBC',
            'name': 'Société Générale',
            'last_price': 15600,
            'variation': 2.15,
            'volume': 7800,
            'open': 15300,
            'high': 15700,
            'low': 15200,
            'previous_close': 15270,
            'sector': 'Banque',
            'value': 121680000
        }
    ]
    
    return {
        'timestamp': datetime.now().isoformat(),
        'source': 'sample_data',
        'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'market': 'BRVM',
        'stocks': sample_stocks,
        'indices': [
            {'name': 'BRVM Composite', 'value': 145.67, 'change': 0.45},
            {'name': 'BRVM 10', 'value': 128.34, 'change': 0.32}
        ]
    }

if __name__ == "__main__":
    main()
