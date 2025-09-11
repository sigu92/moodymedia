#!/usr/bin/env python3
"""
SQL File Validator
Checks all SQL migration files for syntax errors and mixed content
"""

import os
import glob

def validate_sql_file(filepath):
    """Validate a single SQL file for TypeScript/JavaScript content"""
    errors = []

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        lines = content.split('\n')

        for i, line in enumerate(lines, 1):
            line = line.strip()

            # Check for TypeScript/JavaScript imports
            if line.startswith('import ') and ('from' in line or 'require(' in line):
                errors.append(f"Line {i}: Contains JavaScript/TypeScript import: {line}")

            # Check for React imports
            if 'import React' in line or 'import { React' in line:
                errors.append(f"Line {i}: Contains React import: {line}")

            # Check for TypeScript type annotations
            if ':' in line and ('string' in line or 'boolean' in line or 'number' in line) and not line.startswith('--'):
                # More sophisticated check for TypeScript types
                if any(keyword in line for keyword in ['interface ', 'type ', 'const ', 'let ', 'function ', 'export ']):
                    errors.append(f"Line {i}: Contains TypeScript code: {line}")

            # Check for JavaScript/TypeScript comments
            if line.startswith('//') or line.startswith('/*') or line.endswith('*/'):
                errors.append(f"Line {i}: Contains JavaScript/TypeScript comment: {line}")

    except Exception as e:
        errors.append(f"Error reading file: {e}")

    return errors

def main():
    """Main validation function"""
    print("🔍 Validating SQL Migration Files...")
    print("=" * 50)

    # Find all SQL files
    sql_files = glob.glob('supabase/migrations/*.sql')

    total_files = len(sql_files)
    files_with_errors = 0
    all_errors = []

    for filepath in sql_files:
        filename = os.path.basename(filepath)
        print(f"📄 Checking {filename}...")

        errors = validate_sql_file(filepath)

        if errors:
            files_with_errors += 1
            print(f"  ❌ Found {len(errors)} errors:")
            for error in errors:
                print(f"     {error}")
            all_errors.extend(errors)
        else:
            print("  ✅ OK")

    print("\n" + "=" * 50)
    print("📊 SUMMARY:")
    print(f"   Total files checked: {total_files}")
    print(f"   Files with errors: {files_with_errors}")
    print(f"   Total errors found: {len(all_errors)}")

    if all_errors:
        print("\n🚨 CRITICAL ERRORS FOUND!")
        print("These files contain TypeScript/JavaScript code that should not be in SQL migrations:")
        for error in all_errors:
            print(f"   • {error}")
        print("\n🔧 ACTION REQUIRED:")
        print("   1. Remove TypeScript/JavaScript code from SQL files")
        print("   2. Only keep pure SQL statements in .sql files")
        print("   3. Move TypeScript code to appropriate .ts/.tsx files")
        return False
    else:
        print("\n✅ All SQL files are clean!")
        return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
