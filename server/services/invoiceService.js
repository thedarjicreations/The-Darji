import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Invoice from '../models/Invoice.js';
import logger from '../config/logger.js';
import { uploadInvoiceToS3, isS3Configured } from './s3Service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function generateInvoice(order, userId = null, existingInvoice = null) {
    const maxRetries = 5;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const invoicesDir = path.join(process.cwd(), 'invoices');
            if (!fs.existsSync(invoicesDir)) {
                fs.mkdirSync(invoicesDir, { recursive: true });
            }

            let invoiceNumber;

            if (existingInvoice) {
                // Reuse existing number
                invoiceNumber = existingInvoice.invoiceNumber;
            } else {
                // Get the last invoice to find the highest invoice number
                const lastInvoice = await Invoice.findOne()
                    .sort({ createdAt: -1 })
                    .select('invoiceNumber')
                    .lean();

                let nextNumber = 1;
                const year = new Date().getFullYear();

                if (lastInvoice && lastInvoice.invoiceNumber) {
                    // Extract the number from the last invoice number (format: TD-YYYY-XXXX)
                    const match = lastInvoice.invoiceNumber.match(/TD-\d{4}-(\d+)/);
                    if (match) {
                        nextNumber = parseInt(match[1], 10) + 1;
                    }
                }
                // Add attempt number to handle race conditions unique to NEW invoices
                invoiceNumber = `TD-${year}-${String(nextNumber + attempt).padStart(4, '0')}`;
            }

            const cleanClientName = order.client.name.replace(/\s+/g, '');
            const fileName = `Invoice_${invoiceNumber}_${cleanClientName}.pdf`;
            const filePath = path.join(invoicesDir, fileName);

            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 60, bottom: 60, left: 60, right: 60 }
            });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Using Helvetica as fallback (similar to Poppins)
            const bodyFont = 'Helvetica';
            const boldFont = 'Helvetica-Bold';
            const titleFont = 'Times-Bold'; // For THE DARJI logo

            const pageWidth = doc.page.width;
            const margin = 60;
            const pageHeight = doc.page.height;
            const bottomMargin = 60;

            // Color scheme
            const brandColor = '#08221d';
            const textColor = '#2A2A2A';
            const lightGray = '#666666';

            let y = margin;

            // Helper function to check if we need a new page
            const checkPageBreak = (spaceNeeded) => {
                // Check if adding content would go beyond the bottom margin
                if (y + spaceNeeded > pageHeight - bottomMargin) {
                    doc.addPage();
                    y = margin;
                    return true;
                }
                return false;
            };

            // Helper function to add section header that won't break awkwardly
            const addSectionHeader = (title, minSpaceForContent = 60) => {
                // Check if we have enough space for header + minimum content
                if (y + 50 + minSpaceForContent > pageHeight - bottomMargin) {
                    doc.addPage();
                    y = margin;
                }

                doc.fontSize(15)
                    .font(boldFont)
                    .fillColor(textColor)
                    .text(title, margin, y);

                y += 24;

                // Horizontal line
                doc.moveTo(margin, y)
                    .lineTo(pageWidth - margin, y)
                    .lineWidth(1)
                    .strokeColor('#000000')
                    .stroke();

                y += 20;
            };

            // Helper function to add table headers
            const addTableHeaders = (headers, qtyColX, priceColX, totalColX, subHeader = null) => {
                doc.fontSize(11)
                    .font(boldFont)
                    .fillColor(textColor)
                    .text(headers.item, margin, y)
                    .text(headers.qty, qtyColX, y, { width: 60, align: 'center' })
                    .text(headers.price, priceColX, y, { width: 90, align: 'center' })
                    .text(headers.total, totalColX, y, { width: 70, align: 'right' });

                y += 14;

                if (subHeader) {
                    doc.fontSize(10)
                        .font(bodyFont)
                        .fillColor(lightGray);

                    if (subHeader.price) {
                        doc.text(subHeader.price, priceColX, y, { width: 90, align: 'center' });
                    }
                    if (subHeader.total) {
                        doc.text(subHeader.total, totalColX, y, { width: 70, align: 'right' });
                    }

                    y += 20;
                } else {
                    y += 6;
                }
            };

            // === HEADER SECTION ===
            // Logo + Brand name with professional alignment
            const logoPath = path.join(process.cwd(), 'server', 'assets', 'THE DARJI_Final_PNG.png');
            const logoSize = 120; // Height of logo - significantly larger to test changes
            let logoWidth = 120; // Will adjust based on actual logo

            // Try to add logo if it exists
            if (fs.existsSync(logoPath)) {
                try {
                    doc.image(logoPath, 20, 10, {
                        height: logoSize
                    });
                    // Calculate actual width after fitting
                    logoWidth = logoSize; // Approximate, will adjust based on image

                    // Brand name with serif font next to logo - aligned vertically centered
                    doc.fontSize(30)
                        .font(titleFont)
                        .fillColor(brandColor)
                        .text('THE DARJI', 20 + logoSize - 30, 50);
                } catch (error) {
                    console.warn('Could not load logo, continuing without it:', error.message);
                    // Fallback: just show brand name
                    doc.fontSize(28)
                        .font(titleFont)
                        .fillColor(brandColor)
                        .text('THE DARJI', margin, y);
                }
            } else {
                // No logo file, just show brand name
                doc.fontSize(30)
                    .font(titleFont)
                    .fillColor(brandColor)
                    .text('THE DARJI', margin, y);
            }

            y += 40;

            // Tagline with smaller font size positioned with a bit of breathing space
            doc.fontSize(8)
                .font(bodyFont)
                .fillColor(brandColor)
                .text('WHERE TRADITION MEETS ELEGANCE', 20 + logoSize - 25, 80);

            // Invoice details on the right
            const rightColX = pageWidth - margin - 140;

            doc.fontSize(11)
                .font(boldFont)
                .fillColor(textColor)
                .text('BILL TO:', margin, margin + 58);

            doc.fontSize(11)
                .font(boldFont)
                .fillColor(textColor)
                .text('INVOICE NO:', rightColX, margin + 58);

            y = margin + 76;

            // Client name
            doc.fontSize(12)
                .font(bodyFont)
                .fillColor(textColor)
                .text(order.client.name, margin, y);

            // Invoice number
            doc.fontSize(12)
                .font(bodyFont)
                .fillColor(textColor)
                .text(invoiceNumber, rightColX, y);

            y += 18;

            // Client phone
            doc.fontSize(11)
                .font(bodyFont)
                .fillColor(lightGray)
                .text(order.client.phone, margin, y);

            // Invoice date
            let invoiceDate;
            try {
                invoiceDate = new Date().toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            } catch (dateError) {
                // Fallback to simple date format
                const now = new Date();
                invoiceDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
            }
            doc.fontSize(11)
                .font(bodyFont)
                .fillColor(lightGray)
                .text(invoiceDate, rightColX, y);

            if (order.client.email) {
                y += 18;
                doc.fontSize(11)
                    .font(bodyFont)
                    .fillColor(lightGray)
                    .text(order.client.email, margin, y);
            }

            y += 48;

            // === STITCHING CHARGES SECTION ===
            const qtyColX = margin + 280;
            const priceColX = margin + 350;
            const totalColX = pageWidth - margin - 70;

            addSectionHeader('Stitching Charges', 100);

            // Add table headers
            addTableHeaders(
                { item: 'OUTFIT', qty: 'Qty', price: 'Stitching', total: 'TOTAL' },
                qtyColX,
                priceColX,
                totalColX,
                { price: 'Price/qty.', total: '(INR)' }
            );

            // Stitching items
            let stitchingTotal = 0;
            doc.fontSize(11)
                .font(bodyFont)
                .fillColor(textColor);

            // Safe access to items with fallback
            const orderItems = order.items || [];
            orderItems.forEach((item, index) => {
                // Check if we need a new page before adding this item
                const itemHeight = 22;
                if (checkPageBreak(itemHeight + 30)) {
                    // Re-add table headers on new page
                    addTableHeaders(
                        { item: 'OUTFIT', qty: 'Qty', price: 'Stitching', total: 'TOTAL' },
                        qtyColX,
                        priceColX,
                        totalColX,
                        { price: 'Price/qty.', total: '(INR)' }
                    );
                    doc.fontSize(11).font(bodyFont).fillColor(textColor);
                }

                // Safety checks for each item
                const garmentName = item?.garmentType?.name || 'Garment';
                const quantity = item?.quantity || 0;
                const price = item?.price || 0;
                const subtotal = item?.subtotal || 0;

                doc.text(garmentName, margin, y, { width: 270 })
                    .text(quantity.toString(), qtyColX, y, { width: 60, align: 'center' })
                    .text(price.toFixed(0), priceColX, y, { width: 90, align: 'center' })
                    .text(subtotal.toFixed(0), totalColX, y, { width: 70, align: 'right' });

                stitchingTotal += subtotal;
                y += itemHeight;
            });

            // === OTHER SERVICES SECTION ===
            const hasNewFormat = order.additionalServices && Array.isArray(order.additionalServices) && order.additionalServices.length > 0;
            const hasOldFormat = (order.additionalServicesAmount || 0) > 0;
            let additionalTotal = 0;

            if (hasNewFormat || hasOldFormat) {
                y += 18;

                addSectionHeader('Other Services', 80);

                // Add table headers
                addTableHeaders(
                    { item: 'Item', qty: 'Qty', price: 'Rate/item', total: 'TOTAL' },
                    qtyColX,
                    priceColX,
                    totalColX,
                    { total: '(INR)' }
                );

                doc.fontSize(11)
                    .font(bodyFont)
                    .fillColor(textColor);

                if (hasNewFormat) {
                    const serviceItems = order.additionalServices || [];
                    serviceItems.forEach(service => {
                        // Check if we need a new page
                        const itemHeight = 22;
                        if (checkPageBreak(itemHeight + 30)) {
                            // Re-add table headers on new page
                            addTableHeaders(
                                { item: 'Item', qty: 'Qty', price: 'Rate/item', total: 'TOTAL' },
                                qtyColX,
                                priceColX,
                                totalColX,
                                { total: '(INR)' }
                            );
                            doc.fontSize(11).font(bodyFont).fillColor(textColor);
                        }

                        const description = service?.description || 'Service';
                        const rate = service?.amount || 0;

                        doc.text(description, margin, y, { width: 270 })
                            .text('1', qtyColX, y, { width: 60, align: 'center' })
                            .text(rate.toFixed(0), priceColX, y, { width: 90, align: 'center' })
                            .text(rate.toFixed(0), totalColX, y, { width: 70, align: 'right' });

                        additionalTotal += rate;
                        y += itemHeight;
                    });
                } else if (hasOldFormat) {
                    additionalTotal = order.additionalServicesAmount;

                    // Check if we need a new page
                    if (checkPageBreak(52)) {
                        addTableHeaders(
                            { item: 'Item', qty: 'Qty', price: 'Rate/item', total: 'TOTAL' },
                            qtyColX,
                            priceColX,
                            totalColX,
                            { total: '(INR)' }
                        );
                        doc.fontSize(11).font(bodyFont).fillColor(textColor);
                    }

                    doc.text(order.additionalServices || 'Additional Services', margin, y, { width: 270 })
                        .text('1', qtyColX, y, { width: 60, align: 'center' })
                        .text(additionalTotal.toFixed(0), priceColX, y, { width: 90, align: 'center' })
                        .text(additionalTotal.toFixed(0), totalColX, y, { width: 70, align: 'right' });

                    y += 22;
                }
            }

            // === TOTAL SUMMARY SECTION ===
            y += 22;

            // Ensure entire summary section fits on one page
            const summaryHeight = 250; // Approximate height needed for entire summary
            checkPageBreak(summaryHeight);

            addSectionHeader('Total Summary', 150);

            // Summary headers
            const summaryLabelX = margin;
            const summaryAmountX = pageWidth - margin - 100;

            doc.fontSize(11)
                .font(boldFont)
                .fillColor(textColor)
                .text('Label', summaryLabelX, y)
                .text('Amount (INR)', summaryAmountX, y, { width: 100, align: 'right' });

            y += 24;

            // Summary items
            doc.fontSize(11)
                .font(bodyFont)
                .fillColor(textColor);

            // Stitching Total
            doc.text('Stitching Total', summaryLabelX, y)
                .text(stitchingTotal.toFixed(0), summaryAmountX, y, { width: 100, align: 'right' });

            y += 22;

            // Other Services
            if (additionalTotal > 0) {
                doc.text('Other Services', summaryLabelX, y)
                    .text(additionalTotal.toFixed(0), summaryAmountX, y, { width: 100, align: 'right' });

                y += 22;
            }

            y += 10;

            // Horizontal line before grand total
            doc.moveTo(margin, y)
                .lineTo(pageWidth - margin, y)
                .lineWidth(1)
                .strokeColor('#000000')
                .stroke();

            y += 20;

            // Grand Total
            const grandTotal = stitchingTotal + additionalTotal;
            doc.fontSize(13)
                .font(boldFont)
                .fillColor(textColor)
                .text('Grand Total', summaryLabelX, y)
                .text(grandTotal.toFixed(0), summaryAmountX, y, { width: 100, align: 'right' });

            y += 22;

            // Advance
            const advance = order.advance || 0;
            doc.fontSize(11)
                .font(bodyFont)
                .fillColor(textColor)
                .text('Advance', summaryLabelX, y)
                .text(advance.toFixed(0), summaryAmountX, y, { width: 100, align: 'right' });

            y += 22;

            // Balance
            const balance = grandTotal - advance;
            doc.fontSize(13)
                .font(boldFont)
                .fillColor(textColor)
                .text('Balance', summaryLabelX, y)
                .text(balance.toFixed(0), summaryAmountX, y, { width: 100, align: 'right' });

            // === NOTES/TERMS SECTION ===
            y += 40;

            // Ensure Notes section fits properly
            checkPageBreak(120);

            addSectionHeader('Notes/Terms', 50);

            doc.fontSize(10)
                .font(bodyFont)
                .fillColor(textColor)
                .text('• Alterations accepted within 7 days of delivery.', margin, y);

            y += 16;

            doc.text('• Delivery timelines may vary as per fabric & customer request.', margin, y);

            // === QUERIES & SUPPORT SECTION ===
            y += 40;

            // Ensure support section fits properly
            checkPageBreak(100);

            addSectionHeader('QUERIES & SUPPORT', 40);

            // Contact information with icons
            const phonePath = path.join(process.cwd(), 'server', 'assets', 'phone.png');
            const instaPath = path.join(process.cwd(), 'server', 'assets', 'insta.png');
            const mailPath = path.join(process.cwd(), 'server', 'assets', 'mail.png');

            const iconSize = 18;
            const iconSpacing = 165;
            const iconY = y;
            const textOffsetY = 3; // Vertical offset to align text with icon center

            // Phone icon and text
            if (fs.existsSync(phonePath)) {
                doc.image(phonePath, 50, 674, { height: 12 });
            }
            doc.fontSize(12)
                .font(bodyFont)
                .fillColor(textColor)
                .text(process.env.BUSINESS_PHONE || '+91-8854017433', 38 + iconSize + 10, iconY + textOffsetY);

            // Instagram icon and text
            if (fs.existsSync(instaPath)) {
                doc.image(instaPath, 25 + iconSpacing, 662, { height: 35 });
            }
            doc.text('thedarji.creations', 28 + iconSpacing + iconSize + 10, iconY + textOffsetY);

            // Email icon and text
            if (fs.existsSync(mailPath)) {
                doc.image(mailPath, 25 + (iconSpacing * 2), 673, { height: 13 });
            }
            doc.text(process.env.BUSINESS_EMAIL || 'thedarji.creations@gmail.com', 17 + (iconSpacing * 2) + iconSize + 10, iconY + textOffsetY);

            // Finalize PDF
            doc.end();

            await new Promise((resolve) => stream.on('finish', resolve));

            // Try to upload to S3 if configured
            let s3Key;
            if (isS3Configured()) {
                try {
                    const pdfBuffer = fs.readFileSync(filePath);
                    const s3Result = await uploadInvoiceToS3(pdfBuffer, fileName);
                    s3Key = s3Result.s3Key;
                    logger.info(`Invoice uploaded to S3: ${s3Key}`);
                } catch (s3Error) {
                    logger.warn(`S3 upload failed, using local storage: ${s3Error.message}`);
                }
            }

            let invoice;
            if (existingInvoice) {
                existingInvoice.s3Key = s3Key;
                /* Strip pdfPath to basename just in case, or keep as is. Logic above uses standard name. */
                existingInvoice.pdfPath = `invoices/${fileName}`;
                // Don't change generatedBy or number
                invoice = await existingInvoice.save();
                logger.info(`Invoice updated: ${invoiceNumber}`);
            } else {
                invoice = await Invoice.create({
                    order: order._id,
                    invoiceNumber,
                    pdfPath: `invoices/${fileName}`,
                    s3Key,
                    generatedBy: userId,
                });
                logger.info(`Invoice generated: ${invoiceNumber}`);
            }
            return invoice;

            logger.info(`Invoice generated: ${invoiceNumber}`);
            return invoice;
        } catch (error) {
            lastError = error;

            // Check if this is a unique constraint error on invoiceNumber (MongoDB)
            if (error.code === 11000 && error.keyPattern?.invoiceNumber) {
                logger.warn(`Invoice number collision on attempt ${attempt + 1}, retrying...`);
                // Wait a bit before retrying to reduce contention
                await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
                continue;
            }

            // If it's not a unique constraint error, throw immediately
            logger.error('Error generating invoice:', error);
            logger.error('Error message:', error.message);
            logger.error('Error stack:', error.stack);
            throw error;
        }
    }

    // If we've exhausted all retries
    logger.error('Failed to generate invoice after all retries');
    logger.error('Last error:', lastError);
    throw lastError;
}
