#!/usr/bin/env ts-node

/**
 * Script to generate OpenAPI specification in JSON format
 * Usage: ts-node src/docs/swagger/generate-spec.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { openApiDocument } from './index';

const outputPath = path.join(__dirname, '../../../openapi.json');

try {
  // Generate JSON
  const jsonContent = JSON.stringify(openApiDocument, null, 2);
  
  // Write to file
  fs.writeFileSync(outputPath, jsonContent, 'utf-8');
  
  console.log(`✅ OpenAPI specification generated successfully!`);
  console.log(`📄 Output: ${outputPath}`);
  console.log(`📊 Stats:`);
  console.log(`   - Paths: ${Object.keys(openApiDocument.paths || {}).length}`);
  console.log(`   - Schemas: ${Object.keys(openApiDocument.components?.schemas || {}).length}`);
  console.log(`   - Tags: ${openApiDocument.tags?.length || 0}`);
  
} catch (error) {
  console.error('❌ Error generating OpenAPI specification:', error);
  process.exit(1);
}