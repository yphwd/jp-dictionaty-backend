const { character, kanji, kanji_component_link, translation, example, component } = require('../models/models');
const ApiError = require('../error/ApiError');


class CharacterController {
    async getOne(req, res, next) {
        const requestBody = req.params;
        const URI = requestBody.URI;
        if (!URI) {
            return next(ApiError.badRequest(`Error! The URI parameter doesn't exist.`));
        };
        const stringId = URI.split('-')[0];
        const id = Number(stringId);
        if (!id) {
            return next(ApiError.badRequest(`Error! The error could happen because of: 1) 'id' param is empty; 2) 'id' param didn't read (it wasn't separated by the dash in the high order URI param).`));
        };
        if (typeof (id) !== 'number') {
            return next(ApiError.badRequest(`Error! The 'id' isn't a 'number' type.`));
        };
        let result;
        const characterPart = await character.findOne({ where: { id } });
        if (characterPart) {
            result = {
                characterPart
            };
        } else {
            return next(ApiError.badRequest(`Error! The character with id='${id}' doesn't exist.`));
        };

        if (characterPart.type === 'KANJI') {
            const kanjiPart = await kanji.findOne({ where: { characterId: id } });
            const kanji_id = kanjiPart.id;
            const examples = await example.findAll({ where: { kanjiId: kanji_id } });
            const translations = await translation.findAll({ where: { kanjiId: kanji_id } });
            const associations = await kanji_component_link.findAll({ where: { kanjiId: kanji_id } });
            result = {
                ...result,
                kanjiPart: {
                    ...kanjiPart,
                    examples,
                    translations,
                },
                associations,
            };
        } else {
            const component = await component.findOne({ where: { characterId: id } });
            const component_id = component.id;
            const associations = await kanji_component_link.findAll({ where: { componentId: component_id } });
            result = {
                ...result,
                kanjiPart: {
                    ...kanjiPart,
                    examples,
                    translations,
                },
                associations,
            };
        };
        return res.status(200).json({ ...result });
    };

    async getAll(req, res, next) {
        const result = await character.findAndCountAll();
        return res.status(200).json(result);
    };

    async create(req, res, next) {
        const {
            associations,
            type,

            title,
            meaning,
            img,
            description,
            mnemoImg,
            mnemoDisc,
            variants,

            translations,
            examples,
            examLevel
        } = req.body;

        const newCharacter = await character.create({
            title,
            type,
            meaning,
            img,
            description,
            mnemoImg,
            mnemoDisc,
            variants,
        });
        newCharacter.URI = `${newCharacter.id}-${meaning}`;
        await newCharacter.save();

        switch (type) {
            case 'KANJI':
                const newKanji = await kanji.create({
                    translations,
                    examples,
                    examLevel,
                    characterId: newCharacter.id
                });
                if (examLevel) {
                    newKanji.examLevel = examLevel;
                    await newKanji.save();
                };
                if (associations[0]) {
                    let i = 0;
                    while (i < associations.length) {
                        const componentId = Number(associations[i]);
                        if (componentId) {
                            await kanji_component_link.create({
                                componentId: associations[i],
                                kanjiId: newKanji.id
                            });
                        };
                        i++;
                    };
                };
                if (translations) {
                    let i = 0;
                    while (i < translations.length) {
                        await translation.create({
                            jpNormalText: translations[i].jpNormalText,
                            jpFuriganaText: translations[i].jpFuriganaText,
                            enText: translations[i].enText,
                            ruText: translations[i].ruText,
                            kanjiId: newKanji.id
                        });
                        i++;
                    };
                };
                if (examples) {
                    let i = 0;
                    while (i < examples.length) {
                        await translation.create({
                            jpNormalText: examples[i].jpNormalText,
                            jpFuriganaText: examples[i].jpFuriganaText,
                            enText: examples[i].enText,
                            ruText: examples[i].ruText,
                            kanjiId: newKanji.id
                        });
                        i++;
                    };
                };
                return res.status(201).json({ message: 'Successful! The new kanji created.' });

            case 'COMPONENT':
                const newComponent = await component.create({
                    characterId: newCharacter.id
                });
                const linkedKanjis = associations.split(splitColumns);
                const kanjiCount = linkedKanjis.length;
                let l_k = 0;
                while (l_k < kanjiCount) {
                    const kanjiId = Number(linkedKanjis[l_k]);
                    await kanji_component_link.create({
                        componentId: newComponent.id,
                        kanjiId: kanjiId
                    });
                    l_k++;
                };
                return res.status(201).json({ message: 'Successful! The new component created.' });

            default:
                return res.status(500).json(`The request didn't have an exist type of character ("KANJI" or "COMPONENT")`);
        };
    };

    async update(req, res, next) {

    };

    async delete(req, res, next) {
        const characterId = req.params.id;
        if (!characterId) {
            return next(ApiError.badRequest(`Error! The ID parameter doesn't exist.`));
        };
        const foundCharacter = await character.findOne({ where: { id: characterId } });
        if (!foundCharacter) {
            return next(ApiError.badRequest(`Error! The character with this ID doesn't exist.`));
        };
        if (foundCharacter.type === 'KANJI') {
            const { id } = await kanji.findOne({ where: { characterId: characterId } });
            await kanji_component_link.destroy({ where: { kanjiId: id } });
            await kanji.destroy({ where: { characterId: characterId } });
        } else if (foundCharacter.type === 'COMPONENT') {
            const { id } = await component.findOne({ where: { characterId: characterId } });
            await kanji_component_link.destroy({ where: { componentId: id } });
            await component.destroy({ where: { characterId: characterId } });
        };
        await character.destroy({ where: { id: characterId } });
        return res.status(200).json(`Character with ID = ${req.params.id} deleted successfully!`);
    };
};

module.exports = new CharacterController();